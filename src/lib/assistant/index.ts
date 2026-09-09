import Anthropic from '@anthropic-ai/sdk'
import { TOOL_DEFINITIONS, runTool, type ToolContext } from './tools'
import { redactPII } from '@/lib/pii'
import { logger } from '@/lib/logger'

// The assistant loop.
//
// The old chat pasted a fixed summary of the user's finances into the system
// prompt and gave the model three transaction tools. That is why every answer
// sounded the same: the summary was the only thing reliably in context, so the
// model paraphrased it whatever it was asked.
//
// Here the prompt carries almost no data. It establishes who the assistant is
// and how to behave, and everything factual comes from a tool call made in
// response to the actual question.

let _client: Anthropic | null = null
function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  return _client
}

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-5'
const MAX_TURNS = 8

function systemPrompt(currency: string, today: string): string {
  return `You are the financial assistant inside FinTrack, a personal finance app. You are talking to the person whose money this is.

Today is ${today}. Their currency is ${currency} — format every amount in it.

## How to answer

Look things up before you answer. You have tools covering transactions, spending by category, cashflow, budgets, goals, bills, debt, net worth, subscriptions and unusual activity. Almost every question deserves at least one call; questions about "how am I doing" usually deserve several. Never answer a factual question from memory of earlier in the conversation — call the tool again, because the underlying data may have changed and because the earlier answer may have covered a different window.

Answer the question that was asked, at the length it deserves. "How much did I spend on coffee?" wants a number and maybe one line of context, not a report. "How am I doing?" wants a real assessment. Do not append a summary of their whole financial position to answers that did not ask for one.

Lead with the answer. Then, if it earns its place, the one thing they could do about it.

Be concrete and specific. Name the actual merchants, the actual amounts, the actual dates. "You spent £340 on food, mostly at Tesco (£210 across 11 visits)" beats "your food spending is significant."

Vary how you write. You are having a conversation, not filling in a template. If you have said something in this conversation already, do not say it again the same way.

## Honesty

Only state figures your tools returned. If a tool comes back empty, say the data is not there — do not estimate, and never invent a merchant, amount or date.

If a tool reports that a debt payoff is not feasible, say plainly that the payments will never clear the debt. Do not quote a payoff date.

You are not a financial adviser, an accountant, or a tax professional. You can explain what the numbers say and point out patterns. For regulated advice — specific investments, tax positions, legal questions — say it is worth speaking to a professional, briefly, and move on. Do not add a disclaimer to every answer.

## Style

Plain language. No headers or bullet lists unless the answer genuinely is a list. No preamble like "Great question" or "Let me look into that". No offering to help further at the end of every message.`
}

export type AssistantResult = {
  reply: string
  toolsUsed: string[]
  degraded: boolean
}

/**
 * Runs one turn of the conversation.
 *
 * `history` is prior turns, oldest first. Tool results are not persisted
 * between turns — each question re-queries — which is what keeps answers
 * current rather than anchored to whatever was fetched first.
 */
export async function askAssistant(
  userMessage: string,
  history: { role: 'user' | 'assistant'; content: string }[],
  ctx: ToolContext
): Promise<AssistantResult> {
  const client = getClient()
  if (!client) {
    return {
      reply:
        'The assistant is not available right now — this app has not been configured with an AI provider key. Everything else in FinTrack still works, and your dashboard has the same figures I would be reading from.',
      toolsUsed: [],
      degraded: true,
    }
  }

  const messages: Anthropic.MessageParam[] = [
    // History is redacted on the way in: it is the user's own prose and may
    // contain an account number they typed.
    ...history.slice(-12).map((m) => ({ role: m.role, content: redactPII(m.content) })),
    { role: 'user' as const, content: redactPII(userMessage) },
  ]

  const toolsUsed: string[] = []
  let reply = ''

  try {
    for (let turn = 0; turn < MAX_TURNS; turn++) {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 8192,
        thinking: { type: 'adaptive' },
        output_config: { effort: 'medium' },
        system: systemPrompt(ctx.currency, ctx.now.toISOString().slice(0, 10)),
        messages,
        tools: TOOL_DEFINITIONS as unknown as Anthropic.Tool[],
      })

      const toolUses = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
      )

      reply += response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('')

      if (toolUses.length === 0) break

      // The assistant turn is echoed back verbatim — thinking blocks included,
      // which the API needs in order to validate the tool calls that follow.
      messages.push({ role: 'assistant', content: response.content })

      // Every result for a turn goes back in a single user message; splitting
      // them teaches the model to stop calling tools in parallel.
      const results = await Promise.all(
        toolUses.map(async (block) => {
          toolsUsed.push(block.name)
          try {
            const result = await runTool(block.name, block.input as Record<string, any>, ctx)
            return {
              type: 'tool_result' as const,
              tool_use_id: block.id,
              content: JSON.stringify(result),
            }
          } catch (err) {
            logger.error('Assistant tool failed', { tool: block.name, error: err })
            return {
              type: 'tool_result' as const,
              tool_use_id: block.id,
              is_error: true,
              content: 'That lookup failed. Tell the user you could not retrieve it.',
            }
          }
        })
      )

      messages.push({ role: 'user', content: results })
    }

    return {
      reply: reply.trim() || 'I could not put an answer together for that. Try rephrasing it?',
      toolsUsed,
      degraded: false,
    }
  } catch (err) {
    logger.error('Assistant turn failed', { userId: ctx.userId, error: err })
    return {
      reply:
        'Something went wrong reaching the assistant. Your data is fine — try again in a moment.',
      toolsUsed,
      degraded: true,
    }
  }
}

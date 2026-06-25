import { Suspense } from 'react'
import LoginForm from './LoginForm'

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <LoginForm />
    </Suspense>
  )
}

function LoginSkeleton() {
  return (
    <div className="w-full max-w-sm animate-pulse">
      <div className="mb-8 space-y-2">
        <div className="h-8 bg-slate-200 rounded w-1/2" />
        <div className="h-4 bg-slate-200 rounded w-3/4" />
      </div>

      <div className="flex flex-col gap-3 mb-6">
        <div className="h-10 bg-slate-200 rounded-lg" />
        <div className="h-10 bg-slate-200 rounded-lg" />
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div className="h-px flex-1 bg-slate-200" />
        <div className="h-3 bg-slate-200 rounded w-4" />
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <div className="h-3 bg-slate-200 rounded w-20" />
          <div className="h-10 bg-slate-200 rounded-lg" />
        </div>
        <div className="space-y-1.5">
          <div className="h-3 bg-slate-200 rounded w-16" />
          <div className="h-10 bg-slate-200 rounded-lg" />
        </div>
        <div className="h-10 bg-slate-200 rounded-lg" />
      </div>
    </div>
  )
}

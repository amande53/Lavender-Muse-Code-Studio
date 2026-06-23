import { Spinner } from "@/components/ui/spinner"

export const AuthLoadingView = () => {
  return (
    <div className="flex items-center justify-center h-screen background">
      <Spinner className="size-6 text-ring" />
    </div>
  )
}
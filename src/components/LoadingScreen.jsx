import TetrisLoading from '@/components/ui/tetris-loader'

export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gray-950">
      <TetrisLoading size="md" speed="fast" loadingText="Loading..." />
    </div>
  )
}

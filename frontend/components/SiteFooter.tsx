export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-6 text-sm text-mute sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p className="text-ink">LogiCraft</p>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span>Riya Jaiswal</span>
          <span aria-hidden="true" className="text-line">
            /
          </span>
          <a className="break-all underline-offset-4 hover:text-ink hover:underline" href="mailto:riyajstar07@gmail.com">
            riyajstar07@gmail.com
          </a>
          <span aria-hidden="true" className="text-line">
            /
          </span>
          <a className="underline-offset-4 hover:text-ink hover:underline" href="https://riyajaiswal.com">
            riyajaiswal.com
          </a>
        </p>
      </div>
    </footer>
  )
}

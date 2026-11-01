export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-mute sm:flex-row sm:items-center sm:justify-between md:px-8">
        <p className="text-ink">LogiCraft</p>
        <p>
          Riya Jaiswal
          <span className="px-2 text-line">/</span>
          <a className="underline-offset-4 hover:text-ink hover:underline" href="mailto:riyajstar07@gmail.com">
            riyajstar07@gmail.com
          </a>
          <span className="px-2 text-line">/</span>
          <a className="underline-offset-4 hover:text-ink hover:underline" href="https://riyajaiswal.com">
            riyajaiswal.com
          </a>
        </p>
      </div>
    </footer>
  )
}

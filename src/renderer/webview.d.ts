declare namespace JSX {
  interface IntrinsicElements {
    webview: React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement> & {
        src?: string
        preload?: string
        allowpopups?: string
        partition?: string
        useragent?: string
        nodeintegration?: string
        disablewebsecurity?: string
      },
      HTMLElement
    >
  }
}

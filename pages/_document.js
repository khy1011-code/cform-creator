import { Html, Head, Main, NextScript } from "next/document";

// Preload a handful of premium Google Fonts so the CMS font picker
// can switch between them instantly.
export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400&family=Cormorant+Garamond:wght@300;400;500;600&family=Inter:wght@300;400;500;600;700&family=Poppins:wght@300;400;500;600&family=Lora:wght@400;500;600&family=Montserrat:wght@300;400;500;600&family=Cormorant:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}

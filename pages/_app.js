import "../styles/globals.css";
import MetaPixel from "../components/MetaPixel";

// Each page applies its own theme: the public form uses its form's
// theme, and the CMS applies the theme of the form being edited.
export default function App({ Component, pageProps }) {
  return (
    <>
      <MetaPixel />
      <Component {...pageProps} />
    </>
  );
}

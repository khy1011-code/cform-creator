import Head from "next/head";

// Neutral root. A bare visit to the domain reveals nothing about the
// platform — real visitors always arrive at a specific form URL
// (e.g. /your-form-slug). The CMS lives at /admin.
export default function Home() {
  return (
    <>
      <Head><title>Welcome</title></Head>
      <div className="ty-shell">
        <div className="app">
          <div className="screen-body" style={{ justifyContent: "center", textAlign: "center", minHeight: "100vh" }}>
            <h2 className="screen-title" style={{ marginTop: 0 }}>Nothing to see here.</h2>
            <p className="screen-subtitle">If you were given a link, please open that link directly.</p>
          </div>
        </div>
      </div>
    </>
  );
}

import Script from "next/script";
import { useEffect } from "react";
import { useRouter } from "next/router";

// One pixel covers the whole site (every form). Override via env if needed.
export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || "2169502100563220";

// Fire a Meta "Lead" event, tagged so 250 vs 217 are distinguishable.
// eventId is shared with the server-side CAPI event so Meta de-duplicates.
export function trackLead(form, eventId, value) {
  if (typeof window === "undefined" || !window.fbq) return;
  const data = {
    content_name: form?.title || "",
    content_category: form?.slug || "",
  };
  if (value) { data.currency = "USD"; data.value = value; }
  window.fbq("track", "Lead", data, eventId ? { eventID: eventId } : undefined);
}

export default function MetaPixel() {
  const router = useRouter();
  const onAdmin = router.pathname.startsWith("/admin");

  // PageView on client-side route changes too (not just first load).
  useEffect(() => {
    if (!META_PIXEL_ID) return;
    const onRoute = (url) => {
      if (window.fbq && !String(url).startsWith("/admin")) window.fbq("track", "PageView");
    };
    router.events.on("routeChangeComplete", onRoute);
    return () => router.events.off("routeChangeComplete", onRoute);
  }, [router.events]);

  // Don't track the hidden CMS.
  if (!META_PIXEL_ID || onAdmin) return null;

  return (
    <Script id="meta-pixel" strategy="afterInteractive">
      {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${META_PIXEL_ID}');fbq('track','PageView');`}
    </Script>
  );
}

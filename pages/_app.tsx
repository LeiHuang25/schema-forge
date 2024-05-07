import '@/styles/tailwind.css';
import '@/styles/browser.css';

function MyApp({ Component, pageProps }:{Component:any, pageProps:any}) {
    return <Component {...pageProps} />
  }

  export default MyApp;
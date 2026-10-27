import Menu from "../components/Menu";
import "../styles/styles.css"; // Revisa que el archivo exista en la carpeta styles

export default function App({ Component, pageProps }) {
  return (
    <>
      <Menu />
      <Component {...pageProps} />
    </>
  );
}
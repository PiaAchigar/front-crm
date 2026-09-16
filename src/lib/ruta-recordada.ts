import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

/**
 * Dónde estaba parada la usuaria, para devolverla ahí al recargar.
 *
 * **El problema.** El CRM corre dentro de un `<iframe>` del dashboard, cuyo
 * `src` es siempre la raíz. La URL del navegador dice `/crm` y nada más, así
 * que al recargar el CRM arranca de cero y cae en el Inbox — aunque la usuaria
 * estuviera mirando la ficha de una clienta (Pia, 2026-09-16).
 *
 * **Por qué `sessionStorage` y no la URL.** Guardarlo acá resuelve la recarga
 * sin inventar un protocolo entre las dos apps. Lo que NO da es un link
 * compartible ni el botón Atrás: para eso habría que reflejar la ruta del
 * iframe en la URL del dashboard, que es bastante más caro y se puede montar
 * encima de esto sin deshacerlo (decisión de Pia, 2026-09-16).
 *
 * Es por pestaña, que es lo que se quiere: dos pestañas abiertas en pantallas
 * distintas no se pisan.
 */

/** Path + query, que es lo que define la pantalla. El hash no se usa. */
function rutaDe(l: { pathname: string; search: string }): string {
  return `${l.pathname}${l.search}`;
}

/**
 * Lee la ruta guardada. Devuelve `null` si no hay, o si el navegador no deja
 * tocar el storage — pasa en modo privado y con las cookies bloqueadas, y ahí
 * lo correcto es arrancar donde arranca siempre, no romper.
 */
export function rutaGuardada(clave: string): string | null {
  try {
    return sessionStorage.getItem(clave);
  } catch {
    return null;
  }
}

/** Guarda la ruta. Si el storage no está disponible, no pasa nada. */
export function guardarRuta(clave: string, ruta: string): void {
  try {
    sessionStorage.setItem(clave, ruta);
  } catch {
    // Sin storage no hay memoria, y es un lujo: no vale romper la pantalla.
  }
}

/**
 * Va anotando la pantalla actual, cada vez que cambia.
 *
 * **Saltea la primera pasada a propósito.** Al montar, la ruta todavía es la
 * de arranque —la raíz del iframe—; anotarla ahí pisaría lo guardado justo
 * antes de poder restaurarlo.
 */
export function useRecordarRuta(clave: string): void {
  const location = useLocation();
  const primera = useRef(true);

  useEffect(() => {
    if (primera.current) {
      primera.current = false;
      return;
    }
    guardarRuta(clave, rutaDe(location));
  }, [clave, location]);
}

/**
 * A dónde mandar a la usuaria cuando entra por la raíz del iframe.
 *
 * La raíz nunca es un destino: mandarla ahí sería el bucle de redirigirse a sí
 * misma. Sin nada guardado —la primera vez— va a la pantalla de siempre.
 */
export function destinoDeArranque(guardada: string | null, porDefecto: string): string {
  if (!guardada || guardada === "/") return porDefecto;
  return guardada;
}

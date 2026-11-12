import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { escucharAbrirConversacion, isEmbedded } from "../../lib/embed";

/**
 * El dashboard pide abrir una conversación (tocaron un aviso con el CRM ya
 * abierto). Si el CRM está en otra pantalla, lleva al Inbox con esa
 * conversación; si ya está en el Inbox, `InboxPage` la selecciona sola.
 */
export function useIrAlInboxAlAbrir() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  useEffect(() => {
    if (!isEmbedded) return;
    return escucharAbrirConversacion((id) => {
      if (pathname !== "/inbox") navigate(`/inbox?conversacion=${encodeURIComponent(id)}`);
    });
  }, [navigate, pathname]);
}

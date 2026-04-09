from __future__ import annotations

import logging
import smtplib
from dataclasses import dataclass
from email.message import EmailMessage
from email.utils import formataddr
from html import escape
from urllib.parse import urljoin

from backend.app.core.config import get_settings
from backend.app.services.database import fetch_one

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class EmailUserContext:
    user_id: str
    email: str
    username: str
    display_name: str
    email_notifications: bool
    security_alerts: bool


def _normalize_path(path: str | None) -> str:
    normalized = str(path or "").strip()
    if not normalized:
        return ""
    return normalized if normalized.startswith("/") else f"/{normalized}"


def build_absolute_frontend_url(path: str | None) -> str:
    settings = get_settings()
    frontend_url = settings.frontend_url.rstrip("/") + "/"
    return urljoin(frontend_url, _normalize_path(path).lstrip("/"))


def get_email_user_context(user_id: str) -> EmailUserContext | None:
    row = fetch_one(
        """
        SELECT
          p.id,
          p.email,
          p.username,
          p.full_name,
          COALESCE(pref.email_notifications, true) AS email_notifications,
          COALESCE(pref.security_alerts, true) AS security_alerts
        FROM public.vw_profiles p
        LEFT JOIN public.vw_profile_preferences pref
          ON pref.user_id = p.id
        WHERE p.id = %s
        LIMIT 1
        """,
        (user_id,),
    )
    if not row:
        return None

    email = str(row.get("email") or "").strip().lower()
    username = str(row.get("username") or "").strip()
    resolved_user_id = str(row.get("id") or "").strip()
    if not email or not username or not resolved_user_id:
        return None

    display_name = str(row.get("full_name") or "").strip() or username
    return EmailUserContext(
        user_id=resolved_user_id,
        email=email,
        username=username,
        display_name=display_name,
        email_notifications=bool(row.get("email_notifications", True)),
        security_alerts=bool(row.get("security_alerts", True)),
    )


def _build_message(
    *,
    to_email: str,
    subject: str,
    html_body: str,
    text_body: str,
) -> EmailMessage:
    settings = get_settings()
    message = EmailMessage()
    message["To"] = to_email
    message["From"] = formataddr((settings.mail_from_name, settings.mail_from_email))
    message["Subject"] = subject
    message.set_content(text_body)
    message.add_alternative(html_body, subtype="html")
    return message


def send_email(
    *,
    to_email: str,
    subject: str,
    html_body: str,
    text_body: str,
) -> bool:
    settings = get_settings()
    normalized_email = to_email.strip().lower()
    if not normalized_email or settings.mail_delivery_mode == "disabled":
        return False

    message = _build_message(
        to_email=normalized_email,
        subject=subject,
        html_body=html_body,
        text_body=text_body,
    )

    if settings.mail_delivery_mode == "console":
        logger.info(
            "ATOM email\nTo: %s\nSubject: %s\n\n%s",
            normalized_email,
            subject,
            text_body,
        )
        return True

    if not settings.smtp_host or not settings.mail_from_email:
        logger.warning("Email SMTP omitido por configuración incompleta")
        return False

    try:
        if settings.smtp_use_ssl:
            client: smtplib.SMTP = smtplib.SMTP_SSL(
                settings.smtp_host,
                settings.smtp_port,
                timeout=10,
            )
        else:
            client = smtplib.SMTP(
                settings.smtp_host,
                settings.smtp_port,
                timeout=10,
            )

        with client:
            if settings.smtp_use_tls and not settings.smtp_use_ssl:
                client.starttls()
            if settings.smtp_username:
                client.login(settings.smtp_username, settings.smtp_password)
            client.send_message(message)
        return True
    except Exception:
        logger.exception("No se pudo enviar el email a %s", normalized_email)
        return False


def _render_lines(items: list[str]) -> str:
    return "".join(
        f"<p style=\"margin:0 0 14px;color:#0f172a;font-size:15px;line-height:1.7;\">{escape(item)}</p>"
        for item in items
        if item.strip()
    )


def build_email_contents(
    *,
    title: str,
    preview: str,
    intro: str,
    paragraphs: list[str],
    action_label: str | None = None,
    action_url: str | None = None,
    accent_label: str | None = None,
    accent_value: str | None = None,
    footer: str | None = None,
) -> tuple[str, str]:
    logo_url = build_absolute_frontend_url("/images/logo.png")
    safe_title = escape(title)
    safe_preview = escape(preview)
    safe_intro = escape(intro)
    safe_footer = escape(footer or "Este correo ha sido enviado automáticamente por ATOM.")
    action_html = ""
    text_lines = [title, "", intro]
    if paragraphs:
        text_lines.extend(["", *paragraphs])
    if accent_label and accent_value:
        action_html += (
            "<div style=\"margin:22px 0;padding:16px 18px;border-radius:16px;"
            "background:linear-gradient(135deg,#eff6ff,#dbeafe);border:1px solid #bfdbfe;\">"
            f"<div style=\"font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;"
            f"color:#1d4ed8;margin-bottom:8px;\">{escape(accent_label)}</div>"
            f"<div style=\"font-size:20px;font-weight:700;color:#0f172a;\">{escape(accent_value)}</div>"
            "</div>"
        )
        text_lines.extend(["", f"{accent_label}: {accent_value}"])
    if action_label and action_url:
        safe_action_label = escape(action_label)
        safe_action_url = escape(action_url, quote=True)
        action_html += (
            f"<a href=\"{safe_action_url}\" "
            "style=\"display:inline-block;margin-top:8px;padding:13px 22px;border-radius:999px;"
            "background:#2563eb;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;\">"
            f"{safe_action_label}</a>"
        )
        text_lines.extend(["", f"{action_label}: {action_url}"])

    html = f"""
<!doctype html>
<html lang="es">
  <body style="margin:0;padding:32px 16px;background:#e2e8f0;font-family:Arial,sans-serif;">
    <span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;">
      {safe_preview}
    </span>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;margin:0 auto;">
      <tr>
        <td style="padding:0;">
          <div style="overflow:hidden;border-radius:28px;background:#ffffff;box-shadow:0 24px 60px rgba(15,23,42,.18);">
            <div style="padding:26px 28px;background:linear-gradient(135deg,#eff6ff,#dbeafe 55%,#bfdbfe);border-bottom:1px solid #cbd5e1;">
              <div style="display:flex;align-items:center;gap:14px;">
                <img src="{escape(logo_url, quote=True)}" alt="ATOM" width="52" height="52" style="display:block;border-radius:14px;background:#ffffff;padding:8px;" />
                <div>
                  <div style="font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#475569;">Atlantic Omics</div>
                  <div style="margin-top:6px;font-size:28px;font-weight:800;line-height:1.2;color:#0f172a;">{safe_title}</div>
                </div>
              </div>
            </div>
            <div style="padding:28px;">
              <p style="margin:0 0 18px;color:#334155;font-size:16px;line-height:1.7;">{safe_intro}</p>
              {_render_lines(paragraphs)}
              {action_html}
            </div>
            <div style="padding:18px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:12px;line-height:1.6;color:#64748b;">
              {safe_footer}
            </div>
          </div>
        </td>
      </tr>
    </table>
  </body>
</html>
""".strip()
    text = "\n".join(line for line in text_lines if line is not None)
    if footer:
        text = f"{text}\n\n{footer}"
    return html, text


def send_password_reset_email(
    *,
    to_email: str,
    username: str,
    reset_url: str,
    expires_minutes: int,
) -> bool:
    html, text = build_email_contents(
        title="Restablece tu contraseña",
        preview="Se ha solicitado un cambio de contraseña para tu cuenta de ATOM.",
        intro=f"Hola {username}, hemos recibido una solicitud para restablecer tu contraseña de ATOM.",
        paragraphs=[
            "Si has solicitado este cambio, usa el botón de abajo para establecer una nueva contraseña.",
            f"Por seguridad, el enlace caduca en {expires_minutes} minutos.",
            "Si no reconoces esta acción, puedes ignorar este mensaje.",
        ],
        action_label="Restablecer contraseña",
        action_url=reset_url,
        footer="Si no has solicitado el cambio, no se ha modificado tu cuenta.",
    )
    return send_email(
        to_email=to_email,
        subject="ATOM · Restablece tu contraseña",
        html_body=html,
        text_body=text,
    )


def send_password_changed_email(
    *,
    to_email: str,
    username: str,
    login_url: str,
) -> bool:
    html, text = build_email_contents(
        title="Contraseña actualizada",
        preview="La contraseña de tu cuenta de ATOM se ha actualizado correctamente.",
        intro=f"Hola {username}, la contraseña de tu cuenta de ATOM se ha cambiado correctamente.",
        paragraphs=[
            "A partir de ahora debes iniciar sesión con la nueva contraseña.",
            "Si no has realizado este cambio, contacta con administración lo antes posible.",
        ],
        action_label="Ir al inicio de sesión",
        action_url=login_url,
        footer="Este aviso de seguridad se envía siempre, aunque tengas desactivados otros correos.",
    )
    return send_email(
        to_email=to_email,
        subject="ATOM · Se ha cambiado tu contraseña",
        html_body=html,
        text_body=text,
    )


def send_account_created_email(
    *,
    to_email: str,
    username: str,
    temporary_password: str,
    login_url: str,
    setup_url: str,
) -> bool:
    html, text = build_email_contents(
        title="Tu cuenta de ATOM ya está lista",
        preview="Se ha creado tu acceso a la plataforma y ya puedes establecer tu contraseña.",
        intro=f"Hola {username}, se ha creado tu usuario en ATOM.",
        paragraphs=[
            "Puedes entrar directamente con la contraseña temporal o, de forma recomendada, establecer una nueva contraseña desde el enlace de activación.",
            "Una vez dentro, revisa tu perfil y cambia la contraseña si todavía no lo has hecho.",
        ],
        action_label="Establecer contraseña",
        action_url=setup_url,
        accent_label="Contraseña temporal",
        accent_value=temporary_password,
        footer=f"También puedes iniciar sesión desde {login_url}",
    )
    return send_email(
        to_email=to_email,
        subject="ATOM · Alta de usuario y acceso inicial",
        html_body=html,
        text_body=text,
    )


def send_notification_email(
    *,
    to_email: str,
    recipient_name: str,
    subject: str,
    title: str,
    message: str,
    action_label: str | None = None,
    action_url: str | None = None,
) -> bool:
    html, text = build_email_contents(
        title=title,
        preview=message,
        intro=f"Hola {recipient_name}, tienes una nueva notificación en ATOM.",
        paragraphs=[message],
        action_label=action_label,
        action_url=action_url,
    )
    return send_email(
        to_email=to_email,
        subject=subject,
        html_body=html,
        text_body=text,
    )

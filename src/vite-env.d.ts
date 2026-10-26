/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE?: string
  readonly VITE_ADMIN_ROLE?: string
  readonly VITE_ACTOR?: string
  readonly VITE_COGNITO_DOMAIN?: string
  readonly VITE_COGNITO_CLIENT_ID?: string
  readonly VITE_COGNITO_REDIRECT_URI?: string
  readonly VITE_COGNITO_LOGOUT_URI?: string
  readonly VITE_COGNITO_SCOPES?: string
  readonly VITE_LOCAL_LOGIN?: string
}

interface Window {
  __EP04_CONFIG__?: {
    cognitoDomain?: string
    cognitoClientId?: string
    cognitoRedirectUri?: string
    cognitoLogoutUri?: string
    cognitoScopes?: string
    localLogin?: string
  }
}

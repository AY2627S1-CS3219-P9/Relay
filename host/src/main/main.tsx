import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@relay/ui/styles.css'
import './index.css'
import App from '../app/App.tsx'
import { Amplify } from 'aws-amplify'

// TODO: for production, use amplify cli to generate output json when building container,
// as that will match our configuration on AWS exactly to Amplify
Amplify.configure({
  Auth: {
    Cognito: {
      // TODO: find out why environment variables are not working
      userPoolEndpoint: import.meta.env.AWS_ENDPOINT_URL || 'http://localhost:4566',
      userPoolClientId: import.meta.env.COGNITO_CLIENT_ID || 'test',
      userPoolId: import.meta.env.COGNITO_USER_POOL_ID || 'us-east-1_test',
      loginWith: {
        username: false,
        email: true,
      }
    }
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

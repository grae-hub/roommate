if (location.hostname === 'localhost') {
    const redirectUri = `${location.origin}/callback`;

    const code = new URLSearchParams(location.search).get('code');

    function decodeJwt(token) {
        return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    }

    // /local-config.json is mounted into the pod by deploy-local.sh
    fetch('/local-config.json')
        .then((res) => res.json())
        .then(({ domain, clientId, clientSecret }) => {
            if (!domain || !clientId) {
                throw new Error('local-config.json is missing domain/clientId');
            }
            startAuth(domain, clientId, clientSecret);
        })
        .catch((err) => {
            document.body.innerHTML = `<h1>local auth config failed to load</h1><pre>${err}</pre>`;
        });

    function startAuth(domain, clientId, clientSecret) {
        if (code) {
            // returning from the hosted ui login — trade the code for a jwt
            fetch(`${domain}/oauth2/token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    grant_type: 'authorization_code', client_id: clientId, client_secret: clientSecret,
                    code, redirect_uri: redirectUri,
                }),
            })
                .then((res) => res.json())
                .then((tokens) => {
                    sessionStorage.cognitoIdToken = tokens.id_token;
                    history.replaceState({}, '', '/'); // remove ?code=... from the url
                    ensureUser(decodeJwt(tokens.id_token).email);
                });
        } else if (!sessionStorage.cognitoIdToken) {
            // no token yet, send the user to cognito's hosted login page
            const params = new URLSearchParams({
                client_id: clientId, response_type: 'code', scope: 'openid email profile', redirect_uri: redirectUri,
            });
            location.href = `${domain}/login?${params}`;
        } else {
            // already logged in this session
            ensureUser(decodeJwt(sessionStorage.cognitoIdToken).email);
        }
    }
}

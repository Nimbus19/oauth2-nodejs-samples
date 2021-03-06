import {StringUtility} from '../StringUtility.js'

export const FacebookController = () => {
    var testArea;
    var logger;
    var config;
    var accessToken;

    const init = async (Logger, HTMLDivElement) => {
        testArea = HTMLDivElement;
        logger = Logger;
        var response = await fetch("../auth_config.json");
        config = (await response.json()).facebook;

        addButtonsToTestArea();
    }

    const addButtonsToTestArea = () => {
        var lable = document.createElement("lable");
        lable.innerHTML = "Facebook Tester"
        testArea.appendChild(lable);
        testArea.appendChild(document.createElement("br"));

        var input = document.createElement("input");
        input.type = "password";
        input.name = "facebook"
        input.id = "client_secret";
        input.placeholder = "Client secret";
        testArea.appendChild(input);
        testArea.appendChild(document.createElement("br"));

        const createButton = (btnName, callback) => {
            var btn = document.createElement("button");
            btn.innerHTML = btnName;
            btn.onclick = callback;
            testArea.appendChild(btn);
        }

        createButton("Auth grant", authGrant);
        createButton("Get token", getToken);
        createButton("Get user info.", getTokenInfo);
        createButton("Get new token", getNewToken);
        createButton("Revoke token", revokeToken);
    }    

    const authGrant = async () => {
        // Create and store a random "state" value
        var state = StringUtility().generateRandomString();
        localStorage.setItem("pkce_state", state);

        // Create and store a new PKCE codeVerifier (the plaintext random secret)
        var codeVerifier = StringUtility().generateRandomString();
        localStorage.setItem("pkce_code_verifier", codeVerifier);

        // Hash and base64-urlencode the secret to use as the challenge
        var codeChallenge = await StringUtility().sha256(codeVerifier);
        codeChallenge = StringUtility().base64urlencode(codeChallenge);

        var authUrl = "https://www.facebook.com/v12.0/dialog/oauth" + 
        `?client_id=${config.client_id}` + 
        `&state=${state}` + 
        `&scope=public_profile email` + 
        `&response_type=code` + 
        `&redirect_uri=http://localhost:3000/` +
        `&code_challenge_method=S256` + 
        `&code_challenge=${codeChallenge}`;

        window.location.href = authUrl;
    }

    const getToken = async () => {
        // Handle the redirect back from the authorization server and
        // get an access token from the token endpoint
        var query = new URLSearchParams(window.location.search);

        // Check if the server returned an error string
        if(query.has("error")) {
            var log = "Error returned from authorization server.";
            var detail = query.has("error");
            logger.add(log, detail, "red");
            throw new Error(log);
        }

        // Verify state matches what we set at the beginning
        if(localStorage.getItem("pkce_state") != query.get("state")) {           
            var log = "Invalid state.";
            var detail = `${localStorage.getItem("pkce_state")}\n${query.get("state")}`;
            logger.add(log, detail, "red");
            throw new Error(log);
        }

        // If the server returned an authorization code, attempt to exchange it for an access token
        if (!query.has("code")) {
            var log = "Auth code not found.";
            logger.add(log, "", "red");
            throw new Error(log);
        }
        
        logger.add("Get auth code.", query.get("code"));
        // window.history.replaceState({}, document.title, "/");

        var myHeaders = new Headers();
        myHeaders.append("content-type", "application/x-www-form-urlencoded");

        var urlencoded = new URLSearchParams();
        urlencoded.append("client_id", config.client_id);
        urlencoded.append("client_secret", getSecret());
        urlencoded.append("grant_type","authorization_code");
        urlencoded.append("code", query.get("code"));
        urlencoded.append("code_verifier", localStorage.getItem("pkce_code_verifier"));
        urlencoded.append("redirect_uri", "http://localhost:3000/");

        var requestOptions = {
            method: 'POST',
            headers: myHeaders,
            body: urlencoded
        };

        fetch("https://graph.facebook.com/v12.0/oauth/access_token", requestOptions)
        .then(async response => {
            if(response.ok) {
                const result = await response.json();
                logger.add("Get token.", `HTTP ${response.status}\n${JSON.stringify(result, null, 2)}`);
                accessToken = result.access_token;
            }
            else {
                const result = await response.text();
                throw new Error(`HTTP ${response.status}\n${result}`);
            }
        })        
        .catch(error => logger.add("Get token error.", error, "red"));
    }

    const getSecret = () => {
        return document.getElementById("client_secret").value;
    }

    const getTokenInfo = async () => {
        var myHeaders = new Headers();
        myHeaders.append('Authorization','Bearer ' + accessToken);

        var requestOptions = {
            method: 'GET',
            headers: myHeaders
        };

        fetch(`https://graph.facebook.com/debug_token?input_token=${accessToken}`, requestOptions)
        .then(async response => {
            const result = await response.text();
            const log = `HTTP ${response.status}\n${result}}`;

            if(response.ok) {
                logger.add("Get access token info.", log);
            }
            else {
                throw new Error(log);
            }
        })
        .catch(error => logger.add("Get access token info error.", error, "red"));
      
        fetch(`https://graph.facebook.com/v12.0/me/permissions`, requestOptions)
        .then(async response => {
            const result = await response.text();
            const log = `HTTP ${response.status}\n${result}}`;

            if(response.ok) {
                logger.add("Get access token scope.", log);
            }
            else {
                throw new Error(log);
            }
        })
        .catch(error => logger.add("Get access token scope error.", error, "red"));  

        fetch(`https://graph.facebook.com/me?access_token=${accessToken}`, requestOptions)
        .then(async response => {
            const result = await response.text();
            const log = `HTTP ${response.status}\n${result}}`;

            if(response.ok) {
                logger.add("Get user info.", log);
            }
            else {
                throw new Error(log);
            }
        })
        .catch(error => logger.add("Get user info error.", error, "red"));
    }

    const getNewToken = async () => {
        var myHeaders = new Headers();
        myHeaders.append("content-type", "application/x-www-form-urlencoded");

        var urlencoded = new URLSearchParams();
        urlencoded.append("client_id", config.client_id);
        urlencoded.append("client_secret", getSecret());
        urlencoded.append("grant_type", "fb_exchange_token");
        urlencoded.append("fb_exchange_token", accessToken);
        urlencoded.append("redirect_uri", "http://localhost:3000");

        var requestOptions = {
            method: 'POST',
            headers: myHeaders,
            body: urlencoded
        };

        fetch("https://graph.facebook.com/v12.0/oauth/access_token", requestOptions)
        .then(async response => {
            if(response.ok) {
                const result = await response.json();
                logger.add("Get new tokens.", `HTTP ${response.status}\n${JSON.stringify(result, null, 2)}`);
                accessToken = result.access_token;
            }
            else {
                const result = await response.text();
                throw new Error(`HTTP ${response.status}\n${result}`);
            }
        })
        .catch(error => logger.add("Get new token error.", error, "red"));
    }

    const revokeToken = async () => {
        var myHeaders = new Headers();
        myHeaders.append('Authorization','Bearer ' + accessToken);

        var requestOptions = {
            method: 'DELETE',
            headers: myHeaders,
        };

        fetch(`https://graph.facebook.com/v12.0/me/permissions`, requestOptions)
        .then(async response => {
            const result = await response.text();
            const log = `HTTP ${response.status}\n${result}`;
            
            if(response.ok) {
                logger.add("Revoke tokens.", log);
            }
            else {
                const result = await response.text();
                throw new Error(log);
            }
        })
        .catch(error => logger.add("Revoke token error.", error, "red"));
    }

    return {
        init: init
    }
}
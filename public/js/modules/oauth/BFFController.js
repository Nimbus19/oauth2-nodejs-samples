export const BFFController = () => {
    var testArea;
    var logger;
    var csrfToken = "";
    var authRequestUrl = "";
    var authCodeUrl = "";

    const init = async (Logger, HTMLDivElement) => {
        testArea = HTMLDivElement;
        logger = Logger;       

        addButtonsToTestArea();
        checkAuthCode();
    }

    const addButtonsToTestArea = () => {
        var lable = document.createElement("lable");
        lable.innerHTML = "BFF Tester"
        testArea.appendChild(lable);
        testArea.appendChild(document.createElement("br"));

        const createButton = (btnName, callback) => {
            var btn = document.createElement("button");
            btn.innerHTML = btnName;
            btn.onclick = callback;
            testArea.appendChild(btn);
        }

        createButton("Login BFF", bffLogin);
        createButton("Get token", bffGetToken);
        createButton("Get user info.", bffUserInfo);
        createButton("Refresh token", bffRefresh);
        createButton("Logout", bffLogout);
    }    

    const checkAuthCode = () => {
        const query = window.location.search;
        const shouldParseResult = query.includes("code=") && query.includes("state=");

        if (shouldParseResult) {
            logger.add("Get auth code.", query);
            authCodeUrl = window.location.href;
        }
    }

    const bffLogin = async () => {
        const result = await fetch('http://localhost:3001/bff/login/start', {
            method: 'POST',
            credentials: "include"
        });
        var status = result.status;
        var response = await result.json();
        authRequestUrl = response.authorizationRequestUrl;

        if (authRequestUrl) {
            window.location.replace(authRequestUrl);
        }

        logger.add("BFF login.",
            status + "\n\n" + 
            JSON.stringify(response, null, 2));
    }

    const bffGetToken = async () => {
        window.history.replaceState({}, document.title, "/");

        const result = await fetch('http://localhost:3001/bff/login/end', {
            method: 'POST',
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                pageUrl: authCodeUrl
            })
        });
        var status = result.status;
        var response = await result.json();
        csrfToken = response.csrf;
        logger.add("Get token.",
            status + "\n\n" + 
            JSON.stringify(response, null, 2));
    }

    const bffUserInfo = async () => {
        const result = await fetch('http://localhost:3001/bff/userInfo', {
            method: 'GET',
            credentials: "include",
        });
        var status = result.status;
        var response = await result.json();
        logger.add("Get user.",
            status + "\n\n" + 
            JSON.stringify(response, null, 2));
    }

    const bffRefresh = async () => {
        const result = await fetch('http://localhost:3001/bff/refresh', {
            method: 'POST',
            credentials: "include",
            headers: {
                "x-bff-csrf": csrfToken
            }
        });
        var status = result.status;
        logger.add("Refresh token.", status + "\n\n");
    }

    const bffLogout = async () => {
        const result = await fetch('http://localhost:3001/bff/logout', {
            method: 'POST',
            credentials: "include",
            headers: {
                "x-bff-csrf": csrfToken
            }
        });
        var status = result.status;
        var response = await result.json();
        window.history.replaceState({}, document.title, "/");
        logger.add("Logout.",
            status + "\n\n" + 
            JSON.stringify(response, null, 2));
    }    

    return {
        init: init
    }
}
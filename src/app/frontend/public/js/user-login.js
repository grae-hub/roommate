// shared "does a user row exist for this email yet" flow — used in every environment
const loadingView = document.getElementById('loading-view');
const usernameView = document.getElementById('username-view');
const welcomeView = document.getElementById('welcome-view');
const welcome = document.getElementById('welcome');
const avatar = document.getElementById('avatar');
const form = document.getElementById('username-form');
const usernameInput = document.getElementById('username');
const usernameError = document.getElementById('username-error');
const usernameSubmit = document.getElementById('username-submit');
const housesMessage = document.getElementById('houses-message');
const housesList = document.getElementById('houses-list');

function showView(view) {
    for (const v of [loadingView, usernameView, welcomeView]) {
        v.hidden = v !== view;
    }
}

// lists the user's houses as tiles, or a message if they're not in any
function showHouses(user) {
    const email = user.user_email;
    housesMessage.hidden = true;
    housesList.replaceChildren();
    fetch(`/api/users/${encodeURIComponent(email)}/houses`)
        .then((res) => res.json())
        .then((data) => {
            if (data.houses.length === 0) {
                housesMessage.textContent = "you're currently a part of no existing houses.";
                housesMessage.hidden = false;
                return;
            }
            for (const house of data.houses) {
                const tile = document.createElement('li');
                tile.className = 'tile';
                const head = document.createElement('div');
                head.className = 'tile-head';
                const street = document.createElement('strong');
                street.textContent = house.house_street_address;
                head.append(street);
                if (user.administered_houses.includes(house.house_id)) {
                    const badge = document.createElement('span');
                    badge.className = 'badge';
                    badge.textContent = 'admin';
                    head.append(badge);
                }
                const place = document.createElement('span');
                place.textContent = `${house.house_suburb} ${house.house_state} ${house.house_postcode}`;
                tile.append(head, place);
                housesList.append(tile);
            }
        })
        .catch(() => {
            housesMessage.textContent = "we couldn't load your houses, try refreshing.";
            housesMessage.hidden = false;
        });
}

function showWelcome(user) {
    const username = user.user_name;
    const name = document.createElement('em');
    name.textContent = username;
    welcome.replaceChildren('welcome,', document.createElement('br'), name);
    avatar.textContent = username.charAt(0);
    showView(welcomeView);
    showHouses(user);
}

// checks the user db for this email; if there's no user yet, shows the username
// field and creates the user when it's submitted
function ensureUser(email) {
    fetch(`/api/users/${encodeURIComponent(email)}`).then((res) => {
        if (res.ok) {
            res.json().then((user) => showWelcome(user));
            return;
        }

        showView(usernameView);
        usernameInput.focus();
        form.onsubmit = (event) => {
            event.preventDefault();
            const username = usernameInput.value.trim();
            if (!username) {
                usernameError.textContent = 'please enter a username';
                return;
            }
            usernameError.textContent = '';
            usernameSubmit.disabled = true;
            fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_email: email, user_name: username }),
            })
                .then((created) => {
                    if (created.ok) {
                        created.json().then((user) => showWelcome(user));
                    } else {
                        created.json().then((err) => { usernameError.textContent = err.error; });
                    }
                })
                .catch(() => { usernameError.textContent = 'something went wrong, try again'; })
                .finally(() => { usernameSubmit.disabled = false; });
        };
    });
}

if (location.hostname !== 'localhost') {
    fetch('/api/whoami')
        .then((res) => res.json())
        .then((data) => ensureUser(data.email));
}

function showOutput(outputId, text) {
    document.querySelectorAll('.form-output').forEach((el) => {
        el.hidden = el.id !== outputId;
    });
    document.getElementById(outputId).textContent = text;
}

async function callApi(outputId, method, path, body) {
    const options = { method };
    if (body !== undefined) {
        options.headers = { 'Content-Type': 'application/json' };
        options.body = JSON.stringify(body);
    }

    const response = await fetch(path, options);
    let result = null;
    try {
        result = await response.json();
    } catch {
        // no JSON body (e.g. a 404 from an unmatched route)
    }

    showOutput(outputId, `${method} ${path} -> ${response.status}\n${JSON.stringify(result, null, 2)}`);
    return { response, result };
}

function formValues(form, fields) {
    const data = {};
    for (const field of fields) {
        data[field] = form.elements[field].value;
    }
    return data;
}

function onSubmit(formId, handler) {
    const outputId = formId.replace(/-form$/, '-output');
    document.getElementById(formId).addEventListener('submit', (event) => {
        event.preventDefault();
        handler(event.target, outputId);
    });
}

// keep the house/user pickers in the "add to house" forms in sync with what actually exists
async function refreshDropdowns() {
    const [usersResult, housesResult] = await Promise.all([
        fetch('/api/users').then((r) => r.json()),
        fetch('/api/houses').then((r) => r.json()),
    ]);

    document.querySelectorAll('select.user-select').forEach((select) => {
        const previous = select.value;
        select.innerHTML = usersResult.users
            .map((user) => `<option value="${user.user_email}">${user.user_email}</option>`)
            .join('');
        if (previous) select.value = previous;
    });

    document.querySelectorAll('select.house-select').forEach((select) => {
        const previous = select.value;
        select.innerHTML = housesResult.houses
            .map((house) => `<option value="${house.house_id}">#${house.house_id} - ${house.house_street_address}</option>`)
            .join('');
        if (previous) select.value = previous;
    });
}

onSubmit('create-user-form', async (form, outputId) => {
    await callApi(outputId, 'POST', '/api/users', formValues(form, ['user_email', 'user_name', 'user_first_name', 'user_last_name']));
    refreshDropdowns();
});

onSubmit('list-users-form', (form, outputId) => {
    callApi(outputId, 'GET', '/api/users');
});

onSubmit('get-user-form', (form, outputId) => {
    const { user_email } = formValues(form, ['user_email']);
    callApi(outputId, 'GET', `/api/users/${encodeURIComponent(user_email)}`);
});

onSubmit('delete-user-form', async (form, outputId) => {
    const { user_email } = formValues(form, ['user_email']);
    await callApi(outputId, 'DELETE', `/api/users/${encodeURIComponent(user_email)}`);
    refreshDropdowns();
});

onSubmit('get-user-houses-form', (form, outputId) => {
    const { user_email } = formValues(form, ['user_email']);
    callApi(outputId, 'GET', `/api/users/${encodeURIComponent(user_email)}/houses`);
});

onSubmit('get-user-administered-houses-form', (form, outputId) => {
    const { user_email } = formValues(form, ['user_email']);
    callApi(outputId, 'GET', `/api/users/${encodeURIComponent(user_email)}/administered-houses`);
});

onSubmit('create-house-form', async (form, outputId) => {
    await callApi(outputId, 'POST', '/api/houses', formValues(form, [
        'house_street_address', 'house_suburb', 'house_postcode',
        'house_state', 'house_country', 'user_email',
    ]));
    refreshDropdowns();
});

onSubmit('list-houses-form', (form, outputId) => {
    callApi(outputId, 'GET', '/api/houses');
});

onSubmit('get-house-form', (form, outputId) => {
    const { house_id } = formValues(form, ['house_id']);
    callApi(outputId, 'GET', `/api/houses/${encodeURIComponent(house_id)}`);
});

onSubmit('delete-house-form', async (form, outputId) => {
    const { house_id } = formValues(form, ['house_id']);
    await callApi(outputId, 'DELETE', `/api/houses/${encodeURIComponent(house_id)}`);
    refreshDropdowns();
});

onSubmit('add-house-user-form', (form, outputId) => {
    const { house_id, user_email } = formValues(form, ['house_id', 'user_email']);
    callApi(outputId, 'POST', `/api/houses/${encodeURIComponent(house_id)}/users`, { user_email });
});

onSubmit('add-house-admin-form', (form, outputId) => {
    const { house_id, user_email } = formValues(form, ['house_id', 'user_email']);
    callApi(outputId, 'POST', `/api/houses/${encodeURIComponent(house_id)}/admins`, { user_email });
});

onSubmit('get-house-users-form', (form, outputId) => {
    const { house_id } = formValues(form, ['house_id']);
    callApi(outputId, 'GET', `/api/houses/${encodeURIComponent(house_id)}/users`);
});

onSubmit('get-house-admins-form', (form, outputId) => {
    const { house_id } = formValues(form, ['house_id']);
    callApi(outputId, 'GET', `/api/houses/${encodeURIComponent(house_id)}/admins`);
});

refreshDropdowns();

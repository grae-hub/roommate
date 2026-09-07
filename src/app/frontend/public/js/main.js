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

onSubmit('create-user-form', (form, outputId) => {
    callApi(outputId, 'POST', '/api/users', formValues(form, ['user_email', 'user_name', 'user_first_name', 'user_last_name']));
});

onSubmit('list-users-form', (form, outputId) => {
    callApi(outputId, 'GET', '/api/users');
});

onSubmit('get-user-form', (form, outputId) => {
    const { user_email } = formValues(form, ['user_email']);
    callApi(outputId, 'GET', `/api/users/${encodeURIComponent(user_email)}`);
});

onSubmit('delete-user-form', (form, outputId) => {
    const { user_email } = formValues(form, ['user_email']);
    callApi(outputId, 'DELETE', `/api/users/${encodeURIComponent(user_email)}`);
});

onSubmit('create-house-form', (form, outputId) => {
    callApi(outputId, 'POST', '/api/houses', formValues(form, [
        'house_street_address', 'house_suburb', 'house_postcode',
        'house_state', 'house_country', 'user_email',
    ]));
});

onSubmit('list-houses-form', (form, outputId) => {
    callApi(outputId, 'GET', '/api/houses');
});

onSubmit('get-house-form', (form, outputId) => {
    const { house_id } = formValues(form, ['house_id']);
    callApi(outputId, 'GET', `/api/houses/${encodeURIComponent(house_id)}`);
});

onSubmit('delete-house-form', (form, outputId) => {
    const { house_id } = formValues(form, ['house_id']);
    callApi(outputId, 'DELETE', `/api/houses/${encodeURIComponent(house_id)}`);
});

onSubmit('add-house-user-form', (form, outputId) => {
    const { house_id, user_email } = formValues(form, ['house_id', 'user_email']);
    callApi(outputId, 'POST', `/api/houses/${encodeURIComponent(house_id)}/users`, { user_email });
});

onSubmit('add-house-admin-form', (form, outputId) => {
    const { house_id, user_email } = formValues(form, ['house_id', 'user_email']);
    callApi(outputId, 'POST', `/api/houses/${encodeURIComponent(house_id)}/admins`, { user_email });
});

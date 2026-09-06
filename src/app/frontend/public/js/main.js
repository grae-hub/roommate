document.getElementById('create-user-form').addEventListener('submit', async (event) => {
    event.preventDefault();

    const statusEl = document.getElementById('form-status');
    const userEmail = document.getElementById('user-email').value;
    const userName = document.getElementById('user-name').value;

    const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_email: userEmail, user_name: userName }),
    });
    const result = await response.json();

    if (response.ok) {
        statusEl.textContent = `Created user: ${result.user_email}`;
        event.target.reset();
    } else {
        statusEl.textContent = `Error: ${result.error || 'something went wrong'}`;
    }
});

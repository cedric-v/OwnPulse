// OwnPulse CRM — popup script
const $ = (id) => document.getElementById(id);

function render(session) {
    if (session?.loggedIn) {
        $('logged-out').style.display = 'none';
        $('logged-in').style.display = 'block';
        $('email-label').textContent = session.email || '';
    } else {
        $('logged-out').style.display = 'block';
        $('logged-in').style.display = 'none';
        $('password').value = '';
    }
}

chrome.runtime.sendMessage({ type: 'getSessionInfo' }, render);

$('login-btn').addEventListener('click', () => {
    const email = $('email').value.trim();
    const password = $('password').value;
    $('error').textContent = '';
    $('login-btn').disabled = true;
    chrome.runtime.sendMessage({ type: 'login', email, password }, (resp) => {
        $('login-btn').disabled = false;
        if (!resp?.ok) {
            $('error').textContent = resp?.error || 'Login failed';
            return;
        }
        render({ loggedIn: true, email: resp.email });
    });
});

$('logout-btn').addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'logout' }, () => render({ loggedIn: false }));
});

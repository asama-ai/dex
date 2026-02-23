document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('local-login');
  const submitButton = document.getElementById('submit-login');
  const errorMessage = document.getElementById('error-message');

  // Attach password toggle behaviour if present
  const passwordInput = document.getElementById('password');
  const togglePassword = document.getElementById('togglePassword');
  if (passwordInput && togglePassword) {
    togglePassword.addEventListener('click', function () {
      const type =
        passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
      passwordInput.setAttribute('type', type);
      this.classList.toggle('show');
    });

    togglePassword.addEventListener('keypress', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.click();
      }
    });
  }

  // If there's no local-login form on this page, nothing else to do
  if (!form || !submitButton || !errorMessage) {
    return;
  }

  const urlParams = new URLSearchParams(window.location.search);

  // Expect only hostname in data-tenant-url (e.g. "egp.asama.cloud")
  const tenantHost =
    (form.dataset && form.dataset.tenantUrl
      ? form.dataset.tenantUrl
      : 'egp.asama.cloud'
    ).trim();
  const BASE_URL = `https://${tenantHost}`;

  function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    submitButton.removeAttribute('disabled');
    submitButton.textContent = 'Log In';
  }

  function hideError() {
    errorMessage.style.display = 'none';
    errorMessage.textContent = '';
  }

  // Set hidden field values from URL parameters
  const paramFields = [
    'client_id',
    'redirect_uri',
    'state',
    'response_type',
    'scope',
    'connector_id',
  ];
  paramFields.forEach((field) => {
    const input = form.querySelector(`input[name="${field}"]`);
    if (input) {
      input.value = urlParams.get(field) || '';
    }
  });

  // Handle form submission
  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    hideError();
    submitButton.setAttribute('disabled', 'disabled');
    submitButton.textContent = 'Logging in...';

    try {
      // Step 1: Construct the URL with all current parameters
      const initialParams = new URLSearchParams(window.location.search);
      const firstRequestUrl = `${BASE_URL}/dex/auth/local?${initialParams.toString()}`;

      // Make the first request to get redirect URL
      const response = await fetch(firstRequestUrl, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('auth-url');
      }

      // Get the redirect URL from response
      const loginUrl = response.url;
      const formData = new FormData(form);

      const loginResponse = await fetch(loginUrl, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!loginResponse.ok) {
        throw new Error('credentials');
      }

      const approvalUrl = loginResponse.url;
      const approvalResponse = await fetch(approvalUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'approval=approve',
      });

      if (!approvalResponse.ok) {
        throw new Error('approval');
      }

      window.location.href = BASE_URL;
    } catch (error) {
      switch (error.message) {
        case 'credentials':
          showError(
            'Invalid email or password. Please check your credentials and try again.',
          );
          break;
        case 'approval':
          showError('Authorization failed. Please try again later.');
          break;
        case 'auth-url':
          showError('Unable to initialize login. Please try again later.');
          break;
        default:
          showError('An unexpected error occurred. Please try again later.');
      }
    }
  });
}
);


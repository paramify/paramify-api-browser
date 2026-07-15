//-----------------------------------------
// Components
//-----------------------------------------
const loginForm = document.getElementById('login-form');
const loginSection = document.getElementById('login-section');
const apiSection = document.getElementById('api-section');
const logoutForm = document.getElementById('logout-form');
const outputSection = document.getElementById('response-output');
const apiButtons = document.querySelectorAll('.api-button');

//-----------------------------------------
// Event listeners  - Login, Logout & API calls
//-----------------------------------------
logoutForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    loginSection.style.display = 'block';
    apiSection.style.display = 'none';
    await fetch('/logout');
});

// Function to load projects into the dropdown
async function loadProjects() {
  const projectSelect = document.getElementById('projectId');
  projectSelect.innerHTML = '<option value="">Loading projects...</option>';
  
  try {
    const response = await fetch('/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ endpoint: '/projects' })
    });
    
    if (response.ok) {
      const data = await response.json();
      projectSelect.innerHTML = '<option value="">Select a project...</option>';
      
      if (data.projects && data.projects.length > 0) {
        data.projects.forEach(project => {
          const option = document.createElement('option');
          option.value = project.id;
          option.textContent = project.name || project.systemName || project.id;
          projectSelect.appendChild(option);
        });
      } else {
        projectSelect.innerHTML = '<option value="">No projects found</option>';
      }
    } else {
      projectSelect.innerHTML = '<option value="">Error loading projects</option>';
    }
  } catch (error) {
    console.error('Error loading projects:', error);
    projectSelect.innerHTML = '<option value="">Error loading projects</option>';
  }
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const apiURL = document.getElementById('apiURL').value;
  const apiToken = document.getElementById('apiToken').value;

  try {
    const response =  await fetch('/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ apiURL, apiToken })
    });

    if (response.ok) {
      loginSection.style.display = 'none';
      apiSection.style.display = 'block';
      // Load projects after successful login
      await loadProjects();
      // Set up refresh button listener after section is visible
      const refreshProjectsBtn = document.getElementById('refreshProjects');
      if (refreshProjectsBtn) {
        refreshProjectsBtn.addEventListener('click', loadProjects);
      }
    } else {
      alert('Login failed. Please check your credentials.   Error: '+ response.status);
    }
  } catch (error) {
    console.error('Error during login:', error);
    alert('Invalid URL or Token.');
  }
});

// Turn "assessmentId" into "an Assessment"; "projectId" into "a Project".
function humanizePlaceholder(name) {
  const base = name.replace(/Id$/, '');
  const spaced = base.replace(/([A-Z])/g, ' $1').trim();
  const words = spaced.split(/\s+/).map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
  const article = /^[aeiou]/i.test(words) ? 'an' : 'a';
  return { words, article };
}

apiButtons.forEach(button => {
  button.addEventListener('click', () => {
    let endpoint = button.getAttribute('data-endpoint');
    const endpointTemplate = button.getAttribute('data-endpoint-template');

    // Substitute every {placeholderId} in the template from an input with the same id.
    if (endpointTemplate) {
      endpoint = endpointTemplate;
      const placeholders = [...endpointTemplate.matchAll(/\{(\w+)\}/g)].map(m => m[1]);
      for (const name of placeholders) {
        const el = document.getElementById(name);
        const value = el ? el.value.trim() : '';
        if (!value) {
          const { words, article } = humanizePlaceholder(name);
          const verb = el && el.tagName === 'SELECT' ? 'select' : 'enter';
          alert(`Please ${verb} ${article} ${words} first`);
          return;
        }
        endpoint = endpoint.replace(`{${name}}`, encodeURIComponent(value));
      }
    }

    fetch('/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ endpoint })
      })
    .then(response => {
      // Check if response is ok, but still parse JSON even for error responses
      return response.json().then(data => {
        if (!response.ok) {
          // Display error response
          outputSection.innerHTML = '';
          $(outputSection).jsonViewer(data, {collapsed: false});
          document.getElementById('apiName').innerHTML = '<h2 style="color: red;">' + endpoint + ' (Error ' + response.status + ')</h2>';
        } else {
          // Display successful response
          outputSection.innerHTML = '';
          $(outputSection).jsonViewer(data, {collapsed: false});
          document.getElementById('apiName').innerHTML = '<h2>' + endpoint + '</h2>';
        }
      });
    })
    .catch(error => {
        console.error('Error fetching JSON data:', error);
        outputSection.innerHTML = '';
        outputSection.textContent = 'Error executing API call: ' + error.message;
        document.getElementById('apiName').innerHTML = '<h2 style="color: red;">' + endpoint + ' (Error)</h2>';
    });
  });
});

// Sync environment dropdown with URL input
const apiEnvironment = document.getElementById('apiEnvironment');
const apiURLInput = document.getElementById('apiURL');

if (apiEnvironment && apiURLInput) {
  apiEnvironment.addEventListener('change', (event) => {
    apiURLInput.value = event.target.value;
  });
}

// Initially show the login section
loginSection.style.display = 'block';
apiSection.style.display = 'none';
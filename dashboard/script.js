const API_BASE = 'http://localhost:3001/api';
let authToken = localStorage.getItem('token') || null;

// DOM Elements
const loginSection = document.getElementById('loginSection');
const dashboard = document.getElementById('dashboard');
const licenseTableBody = document.getElementById('licenseTableBody');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const daysInput = document.getElementById('daysInput');
const loginError = document.getElementById('loginError');

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
  if (authToken) {
    verifyTokenAndLoadDashboard();
  } else {
    showLogin();
  }
});

// Show login section
function showLogin() {
  loginSection.style.display = 'block';
  dashboard.style.display = 'none';
}

// Show dashboard
function showDashboard() {
  loginSection.style.display = 'none';
  dashboard.style.display = 'block';
  loadLicenses();
}

// Verify token and load dashboard if valid
async function verifyTokenAndLoadDashboard() {
  try {
    const response = await fetch(`${API_BASE}/licenses`, {
      headers: {
        'auth-token': authToken
      }
    });
    
    if (response.ok) {
      showDashboard();
    } else {
      localStorage.removeItem('token');
      authToken = null;
      showLogin();
    }
  } catch (error) {
    console.error('Token verification failed:', error);
    showLogin();
  }
}

// Login function
async function login() {
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();
  
  if (!username || !password) {
    loginError.textContent = 'Please enter both username and password';
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE}/admin/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      authToken = data.token;
      localStorage.setItem('token', authToken);
      loginError.textContent = '';
      showDashboard();
    } else {
      loginError.textContent = data.error || 'Login failed';
    }
  } catch (error) {
    loginError.textContent = 'Connection error. Please try again.';
    console.error('Login error:', error);
  }
}

// Load all licenses
async function loadLicenses() {
  try {
    const response = await fetch(`${API_BASE}/licenses`, {
      headers: {
        'auth-token': authToken
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch licenses');
    }
    
    const licenses = await response.json();
    renderLicenses(licenses);
  } catch (error) {
    console.error('Error loading licenses:', error);
    alert('Failed to load licenses. Please try again.');
  }
}

// Render licenses to table
function renderLicenses(licenses) {
  licenseTableBody.innerHTML = '';
  
  if (licenses.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = `<td colspan="4" style="text-align: center;">No licenses found</td>`;
    licenseTableBody.appendChild(row);
    return;
  }
  
  licenses.forEach(license => {
    const row = document.createElement('tr');
    
    const expiryDate = new Date(license.expiryDate);
    const isExpired = new Date() > expiryDate;
    const statusText = isExpired ? 'Expired' : 'Active';
    const statusClass = isExpired ? 'status-expired' : 'status-active';
    
    row.innerHTML = `
      <td>${license.key}</td>
      <td>${expiryDate.toLocaleDateString()} ${expiryDate.toLocaleTimeString()}</td>
      <td class="${statusClass}">${statusText}</td>
      <td>
        <button class="action-btn extend-btn" onclick="extendLicense('${license._id}')">Extend</button>
        <button class="action-btn delete-btn" onclick="deleteLicense('${license._id}')">Delete</button>
      </td>
    `;
    
    licenseTableBody.appendChild(row);
  });
}

// Generate new license
async function generateLicense() {
  const days = parseInt(daysInput.value);
  
  if (isNaN(days) || days < 1) {
    alert('Please enter a valid number of days (minimum 1)');
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE}/licenses/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'auth-token': authToken
      },
      body: JSON.stringify({ durationDays: days })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to generate license');
    }
    
    const newLicense = await response.json();
    loadLicenses();
    alert(`License generated successfully!\nKey: ${newLicense.key}\nExpires: ${new Date(newLicense.expiryDate).toLocaleString()}`);
  } catch (error) {
    console.error('Error generating license:', error);
    alert(error.message || 'Failed to generate license');
  }
}

// Extend license
async function extendLicense(licenseId) {
  const days = parseInt(daysInput.value);
  
  if (isNaN(days) || days < 1) {
    alert('Please enter a valid number of days (minimum 1)');
    return;
  }
  
  if (!confirm(`Extend this license by ${days} days?`)) {
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE}/licenses/${licenseId}/extend`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'auth-token': authToken
      },
      body: JSON.stringify({ days })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to extend license');
    }
    
    loadLicenses();
    alert('License extended successfully!');
  } catch (error) {
    console.error('Error extending license:', error);
    alert(error.message || 'Failed to extend license');
  }
}

// Delete license
async function deleteLicense(licenseId) {
  if (!confirm('Are you sure you want to delete this license? This cannot be undone.')) {
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE}/licenses/${licenseId}`, {
      method: 'DELETE',
      headers: {
        'auth-token': authToken
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete license');
    }
    
    loadLicenses();
    alert('License deleted successfully!');
  } catch (error) {
    console.error('Error deleting license:', error);
    alert(error.message || 'Failed to delete license');
  }
}

// Logout function
function logout() {
  localStorage.removeItem('token');
  authToken = null;
  showLogin();
  usernameInput.value = '';
  passwordInput.value = '';
}

// Add logout button to dashboard (you'll need to add this button to your HTML)
document.addEventListener('DOMContentLoaded', () => {
  const logoutBtn = document.createElement('button');
  logoutBtn.textContent = 'Logout';
  logoutBtn.className = 'logout-btn';
  logoutBtn.onclick = logout;
  document.querySelector('.container').prepend(logoutBtn);
});
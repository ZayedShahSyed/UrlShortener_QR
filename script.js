

import { getAccessToken, getApiUrl } from './config.js';

let urlsData = JSON.parse(localStorage.getItem('shortenedUrls') || '[]');

async function shortenUrl(longUrl) {
    const accessToken = getAccessToken();
    const apiUrl = getApiUrl();

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ long_url: longUrl }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.link;
    } catch (error) {
        console.error('Error shortening URL:', error);
        throw error;
    }
}


function generateQRCode(url) {
    const encodedUrl = encodeURIComponent(url);
    return `https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodedUrl}`;
}


function saveUrlMapping(originalUrl, shortenedUrl, qrCodeUrl) {
    const mapping = {
        id: Date.now(),
        originalUrl,
        shortenedUrl,
        qrCodeUrl,
        createdAt: new Date().toISOString()
    };
    urlsData.push(mapping);
    localStorage.setItem('shortenedUrls', JSON.stringify(urlsData));
    return mapping.id; // Return the ID for the delete button
}


function deleteUrl(shortenedUrl, rowElement) {
    if (confirm('Are you sure you want to delete this shortened URL?')) {
        
        urlsData = urlsData.filter(item => item.shortenedUrl !== shortenedUrl);

        
        localStorage.setItem('shortenedUrls', JSON.stringify(urlsData));

        rowElement.remove();

        const qrDisplay = document.getElementById('qr_code_result');
        if (qrDisplay.querySelector('img')) {
            qrDisplay.innerHTML = '<p>Select a URL to view its QR code</p>';
        }

        const tableBody = document.getElementById('url_table_body');
        const emptyState = document.getElementById('empty_state');
        if (urlsData.length === 0) {
            tableBody.style.display = 'none';
            if (emptyState) emptyState.style.display = 'block';
        }

        showNotification('URL deleted successfully!');
    }
}


function addUrlToTable(originalUrl, shortenedUrl, qrCodeUrl, urlId) {
    const row = document.createElement('tr');
    row.innerHTML = `
        <td><a href="${originalUrl}" target="_blank" class="url-link">${originalUrl}</a></td>
        <td><a href="${shortenedUrl}" class="short-url-link">${shortenedUrl}</a></td>
        <td>
            <button class="view-qr-btn" data-qr-url="${qrCodeUrl}">View QR</button>
            <button class="copy-btn" data-url="${shortenedUrl}">Copy</button>
            <button class="delete-btn" data-id="${urlId}">Delete</button>
        </td>
    `;

    
    row.querySelector('.view-qr-btn').addEventListener('click', function() {
        displayQRCode(qrCodeUrl);
    });

 
    row.querySelector('.copy-btn').addEventListener('click', function() {
        copyToClipboard(shortenedUrl);
    });

   
    row.querySelector('.delete-btn').addEventListener('click', function() {
        deleteUrl(shortenedUrl, row);
    });

    document.getElementById('url_table_body').appendChild(row);
}


async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showNotification('URL copied to clipboard!');
    } catch (err) {
       
        console.log('Failed to copy: ', err);
    }
}


function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 2000);
}


function displayQRCode(qrCodeUrl) {
    const qrCodeDisplay = document.getElementById('qr_code_result');
    qrCodeDisplay.innerHTML = `<img src="${qrCodeUrl}" alt="QR Code" style="max-width: 100%; height: auto;">`;
}


function loadExistingUrls() {
    const tableBody = document.getElementById('url_table_body');
    const emptyState = document.getElementById('empty_state');
    
    if (urlsData.length === 0) {
        tableBody.style.display = 'none';
        if (emptyState) emptyState.style.display = 'block';
    } else {
        tableBody.style.display = '';
        if (emptyState) emptyState.style.display = 'none';
        urlsData.forEach(item => {
            addUrlToTable(item.originalUrl, item.shortenedUrl, item.qrCodeUrl, item.id);
        });
    }
}


document.getElementById('shorten_btn').addEventListener('click', async function() {
    const urlInput = document.getElementById('url_input');
    const resultDiv = document.getElementById('result');
    const url = urlInput.value.trim();

    if (!url) {
        resultDiv.textContent = 'Please enter a valid URL';
        resultDiv.classList.add('show');
        return;
    }

    
    try {
        new URL(url);
    } catch (e) {
        resultDiv.textContent = 'Please enter a valid URL';
        resultDiv.classList.add('show');
        return;
    }


    const button = document.getElementById('shorten_btn');
    const originalText = button.textContent;
    button.textContent = 'Shortening...';
    button.disabled = true;

    try {
       
        const shortenedUrl = await shortenUrl(url);

       
        const qrCodeUrl = generateQRCode(shortenedUrl);

      
        const urlId = saveUrlMapping(url, shortenedUrl, qrCodeUrl);

        addUrlToTable(url, shortenedUrl, qrCodeUrl, urlId);

        displayQRCode(qrCodeUrl);

        // Hide empty state if showing
        const emptyState = document.getElementById('empty_state');
        const tableBody = document.getElementById('url_table_body');
        if (emptyState && urlsData.length > 0) {
            emptyState.style.display = 'none';
            tableBody.style.display = '';
        }

        resultDiv.textContent = `Shortened URL: ${shortenedUrl}`;
        resultDiv.classList.add('show');

        urlInput.value = '';

        setTimeout(() => {
            resultDiv.classList.remove('show');
        }, 3000);

    } catch (error) {
        resultDiv.textContent = 'Error shortening URL. Please try again.';
        resultDiv.classList.add('show');
        console.error('Error:', error);
    } finally {
        button.textContent = originalText;
        button.disabled = false;
    }
});

document.getElementById('url_input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        document.getElementById('shorten_btn').click();
    }
});

document.addEventListener('DOMContentLoaded', loadExistingUrls);
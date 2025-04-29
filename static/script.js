const video = document.getElementById('video');
const startButton = document.getElementById('start');
const filterToggle = document.getElementById('filterToggle'); // Added
let applyFilter = true; // Added

navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => {
        video.srcObject = stream;
    })
    .catch(err => {
        console.error('Error accessing webcam:', err);
    });

// Filter toggle functionality
filterToggle.addEventListener('click', () => { // Added
    applyFilter = !applyFilter;
    filterToggle.textContent = applyFilter ? 
        'Enable Vintage Filter ☑️' : 
        'Disable Vintage Filter ❎';
});

// Track when "Start Capture" button is clicked
startButton.addEventListener('click', function() {
    gtag('event', 'start_capture_clicked', {
        'event_category': 'Engagement',
        'event_label': 'Start Button Clicked'
    });
});

// Modified capturePhoto function with filter support
function capturePhoto() { // Modified
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    if (applyFilter) { // Added filter application
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
            data[i] = avg;     // R
            data[i + 1] = avg; // G
            data[i + 2] = avg; // B
        }
        ctx.putImageData(imageData, 0, 0);
    }
    
    return canvas.toDataURL('image/png');
}

// Main capture sequence (modified to use the new capturePhoto function)
startButton.addEventListener('click', async () => { // Modified
    capturedPhotos = [];

    // Google Analytics event
    gtag('event', 'start_capture', {
        'event_category': 'Photobooth',
        'event_label': 'User started capture'
    });

    // Capture 3 photos
    for (let i = 0; i < 3; i++) {
        await showCountdown();
        capturedPhotos.push(capturePhoto()); // Now uses the modified function
        await sleep(500);
    }

    // Email input and processing (unchanged)
    let email = null;
    let emailValid = false;
    let custom_text = "Vintage Memories";
    
    while (!emailValid) {
        email = prompt("Enter your email to receive your photo strip (or cancel to skip):");
        if (email === null) {
            gtag('event', 'email_submitted', {
                'event_category': 'Photobooth',
                'event_label': 'No email entered',
                'email_valid': 'none'
            });
            emailValid = true;
        } else if (email === "") {
            gtag('event', 'email_submitted', {
                'event_category': 'Photobooth',
                'event_label': 'Blank email entered',
                'email_valid': 'none'
            });
            alert("Please enter a valid email address.");
        } else if (!validateEmail(email)) {
            gtag('event', 'email_submitted', {
                'event_category': 'Photobooth',
                'event_label': 'Invalid email entered',
                'email_valid': 'invalid'
            });
            alert("Invalid email. Please enter a valid email.");
        } else {
            gtag('event', 'email_submitted', {
                'event_category': 'Photobooth',
                'event_label': 'Email entered',
                'email_valid': 'valid'
            });
            emailValid = true;
        }
    }

    if (email && validateEmail(email)) {
        custom_text = prompt("Enter text for your photo strip (or leave blank for default):");
    }

    if (email && validateEmail(email)) {
        fetch('/capture', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                photos: capturedPhotos,
                email: email,
                custom_text: custom_text || 'Vintage Memories',
                apply_filter: applyFilter // Added this parameter
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Photo strip created and sent!');
            } else {
                alert('Error: ' + (data.error || 'Unknown'));
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
    }
});
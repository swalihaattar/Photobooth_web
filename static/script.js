// ======================
// DOM Element References
// ======================
const video = document.getElementById('video');          // Video element for webcam feed
const startButton = document.getElementById('start');   // Start capture button
const filterToggle = document.getElementById('filterToggle'); // Vintage filter toggle button
let applyFilter = true;                                 // Tracks filter state (enabled by default)

// ======================
// Webcam Initialization
// ======================
navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => {
        video.srcObject = stream; // Display live webcam feed
    })
    .catch(err => {
        console.error('Error accessing webcam:', err); // Error handling
    });

// ===========================
// Vintage Filter Toggle Logic
// ===========================
filterToggle.addEventListener('click', () => {
    // Toggle filter state and update button text
    applyFilter = !applyFilter;
    filterToggle.textContent = applyFilter ? 
        'Enable Vintage Filter ☑️' : 
        'Disable Vintage Filter ❎';
});

// =================================
// Analytics: Start Button Tracking
// =================================
startButton.addEventListener('click', function() {
    // Send event to Google Analytics
    gtag('event', 'start_capture_clicked', {
        'event_category': 'Engagement',
        'event_label': 'Start Button Clicked'
    });
});

// ===========================
// Photo Capture Functionality
// ===========================
function capturePhoto() {
    // Create temporary canvas for image processing
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;    // Match webcam resolution
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    
    // Capture current video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Apply vintage B&W filter if enabled
    if (applyFilter) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Convert to grayscale by averaging RGB values
        for (let i = 0; i < data.length; i += 4) {
            const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
            data[i] = avg;     // Red channel
            data[i + 1] = avg; // Green channel
            data[i + 2] = avg; // Blue channel
        }
        ctx.putImageData(imageData, 0, 0);
    }
    
    return canvas.toDataURL('image/png'); // Return as base64 PNG
}

// ========================
// Main Capture Sequence
// ========================
startButton.addEventListener('click', async () => {
    capturedPhotos = []; // Reset photo array

    // Analytics: Capture started event
    gtag('event', 'start_capture', {
        'event_category': 'Photobooth',
        'event_label': 'User started capture'
    });

    // Capture 3 photos with countdown
    for (let i = 0; i < 3; i++) {
        await showCountdown(); // Show 3-2-1 countdown
        capturedPhotos.push(capturePhoto()); // Capture and store photo
        await sleep(500); // Brief pause between captures
    }

    // ========================
    // Email Collection Flow
    // ========================
    let email = null;
    let emailValid = false;
    let custom_text = "Vintage Memories"; // Default text
    
    // Validate email through prompt
    while (!emailValid) {
        email = prompt("Enter your email to receive your photo strip (or cancel to skip):");
        
        // Handle different user responses
        if (email === null) {
            // User canceled
            gtag('event', 'email_submitted', {
                'event_category': 'Photobooth',
                'event_label': 'No email entered',
                'email_valid': 'none'
            });
            emailValid = true;
        } else if (email === "") {
            // Empty input
            gtag('event', 'email_submitted', {
                'event_category': 'Photobooth',
                'event_label': 'Blank email entered',
                'email_valid': 'none'
            });
            alert("Please enter a valid email address.");
        } else if (!validateEmail(email)) {
            // Invalid format
            gtag('event', 'email_submitted', {
                'event_category': 'Photobooth',
                'event_label': 'Invalid email entered',
                'email_valid': 'invalid'
            });
            alert("Invalid email. Please enter a valid email.");
        } else {
            // Valid email
            gtag('event', 'email_submitted', {
                'event_category': 'Photobooth',
                'event_label': 'Email entered',
                'email_valid': 'valid'
            });
            emailValid = true;
        }
    }

    // Get custom text if email was provided
    if (email && validateEmail(email)) {
        custom_text = prompt("Enter text for your photo strip (or leave blank for default):");
    }

    // ========================
    // Send Data to Server
    // ========================
    if (email && validateEmail(email)) {
        fetch('/capture', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                photos: capturedPhotos,       // Array of captured photos
                email: email,                 // User's email
                custom_text: custom_text || 'Vintage Memories', // Custom or default text
                apply_filter: applyFilter     // Current filter state
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
            console.error('Error:', error); // Log fetch errors
        });
    }
});


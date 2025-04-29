const video = document.getElementById('video');

navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => {
        video.srcObject = stream;
    })
    .catch(err => {
        console.error('Error accessing webcam:', err);
    });

// Track when "Start Capture" button is clicked
document.getElementById('start').addEventListener('click', function() {
    gtag('event', 'start_capture_clicked', {
        'event_category': 'Engagement',
        'event_label': 'Start Button Clicked'
    });
});

// Track when email is entered and submitted
async function capturePhotos() {
    const email = prompt("Enter your email:");
    const custom_text = prompt("Enter text for your photo strip (or leave blank for default):");

    if (!email) return alert("Email is required!");

    // Track the event of email entered
    gtag('event', 'email_entered', {
        'event_category': 'Engagement',
        'event_label': 'Email Entered for Capture'
    });

    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');

    const capturedPhotos = [];

    for (let i = 0; i < 3; i++) {
        await new Promise(resolve => setTimeout(resolve, 3000)); // 3 second wait
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const photo = canvas.toDataURL('image/png');
        capturedPhotos.push(photo);
    }

    const response = await fetch('/capture', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ photos: capturedPhotos, email: email, custom_text: custom_text || 'Vintage Memories' })
    });

    const result = await response.json();
    if (result.success) {
        alert("Your photo strip has been emailed to you!");
    } else {
        alert("Something went wrong: " + (result.error || 'Unknown error'));
    }
}
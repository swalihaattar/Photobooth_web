# =============================================
# Import Required Libraries
# =============================================
from flask import Flask, render_template, request, jsonify  # Flask web framework
from PIL import Image, ImageOps, ImageDraw, ImageFont, ImageEnhance  # Image processing
import os
import base64  # For base64 image decoding
import smtplib, ssl  # Email sending
from email.message import EmailMessage  # Email formatting
from io import BytesIO  # In-memory file handling
import re  # Regular expressions for email validation

# Initialize Flask application
app = Flask(__name__)

# =============================================
# Email Configuration (SECURITY NOTE: Use environment variables in production)
# =============================================
SENDER_EMAIL = "photo.booth.vintage.ccoew@gmail.com"
SENDER_PASSWORD = "psoj mjfn icgf royu"  # App-specific password
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 465  # SSL port for Gmail

# =============================================
# Image Processing Functions
# =============================================
def enhance_image(img):
    """
    Apply vintage filter to image:
    1. Convert to grayscale
    2. Enhance contrast
    3. Apply sepia tone
    """
    # Convert to grayscale (L mode)
    img = img.convert('L')
    
    # Increase contrast by 50%
    enhancer = ImageEnhance.Contrast(img)
    img = enhancer.enhance(1.5)
    
    # Create sepia tone by modifying RGB values
    sepia = []
    for pixel in img.getdata():
        r = int(pixel * 0.9)  # Red component
        g = int(pixel * 0.7)  # Green component
        b = int(pixel * 0.4)  # Blue component
        sepia.append((r, g, b))
    
    # Apply sepia tone
    img = img.convert('RGB')
    img.putdata(sepia)
    return img

# =============================================
# Flask Routes
# =============================================
@app.route('/')
def home():
    """Serve the main photobooth interface"""
    return render_template('index.html')

def validate_email(email):
    """
    Validate email format using regex
    Example: user@example.com
    """
    email_regex = r"(^[\w\.\+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$)"
    return re.match(email_regex, email) is not None

@app.route('/capture', methods=['POST'])
def capture():
    """
    Handle photo capture requests:
    1. Process uploaded images
    2. Create photo strip
    3. Send via email if requested
    """
    # Get JSON data from request
    data = request.json
    photos = data.get('photos')  # List of base64-encoded images
    email = data.get('email')  # Optional recipient email
    custom_text = data.get('custom_text', 'Vintage Memories')  # Default text
    apply_filter = data.get('apply_filter', False)  # Filter toggle

    # Validate at least one photo was provided
    if not photos:
        return jsonify({'error': 'No photos provided'}), 400

    # Process each uploaded image
    images = []
    for img_data in photos:
        try:
            # Decode base64 image (remove data:image/png;base64, prefix)
            img_bytes = base64.b64decode(img_data.split(',')[1])
            img = Image.open(BytesIO(img_bytes)).convert('RGB')
            
            # Apply vintage filter if requested
            if apply_filter:
                img = enhance_image(img)
                
            images.append(img)
        except Exception as e:
            return jsonify({'error': f"Failed to decode image: {str(e)}"}), 400

    # =============================================
    # Create Photo Strip
    # =============================================
    # Create blank canvas (3 photos stacked vertically)
    strip = Image.new('RGB', (320, 3 * 410), (243, 229, 171))  # Vintage cream color
    
    # Paste each resized image onto the strip
    for idx, img in enumerate(images):
        img = img.resize((300, 400))  # Standardize size
        strip.paste(img, (10, idx * 410 + 5))  # Position with 5px padding
    
    # Add decorative gold border
    bordered_strip = ImageOps.expand(strip, border=10, fill='gold')
    
    # Add custom text to the strip
    draw = ImageDraw.Draw(bordered_strip)
    try:
        font = ImageFont.truetype("arial.ttf", size=28)  # Try to load Arial
    except:
        font = ImageFont.load_default()  # Fallback to default font
    
    text = f"{custom_text} 🎉"  # Add celebration emoji
    text_bbox = draw.textbbox((0, 0), text, font=font)
    text_width = text_bbox[2] - text_bbox[0]  # Calculate text width
    
    # Center text at bottom of strip
    position = ((bordered_strip.width - text_width) // 2, bordered_strip.height - 40)
    draw.text(position, text, (255, 215, 0), font=font)  # Gold text color

    # Save strip to memory buffer
    img_bytes_io = BytesIO()
    bordered_strip.save(img_bytes_io, format='PNG')
    img_bytes_io.seek(0)  # Rewind buffer for reading

    # =============================================
    # Email Handling
    # =============================================
    if email:
        # Validate email format
        if not validate_email(email):
            return jsonify({'error': 'Invalid email address'}), 400
        
        try:
            send_email(email, img_bytes_io)
        except Exception as e:
            return jsonify({'error': f"Failed to send email: {str(e)}"}), 500

    return jsonify({'success': True})

# =============================================
# Email Sending Function
# =============================================
def send_email(receiver_email, img_bytes_io):
    """Send email with photo strip attachment"""
    msg = EmailMessage()
    msg['Subject'] = 'Your Vintage Photobooth Strip 🎞'  # Fun emoji in subject
    msg['From'] = SENDER_EMAIL
    msg['To'] = receiver_email
    msg.set_content('Thank you for using the Vintage Party Photobooth! Find your photo strip attached.')

    # Attach the photo strip
    img_bytes_io.seek(0)
    file_data = img_bytes_io.read()
    msg.add_attachment(file_data, maintype='image', subtype='png', filename='vintage_strip.png')

    # Secure SSL connection to SMTP server
    context = ssl.create_default_context()
    with smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT, context=context) as server:
        server.login(SENDER_EMAIL, SENDER_PASSWORD)
        server.send_message(msg)

# =============================================
# Application Entry Point
# =============================================
if __name__ == "__main__":
    app.run(debug=True)  # Run in debug mode for development
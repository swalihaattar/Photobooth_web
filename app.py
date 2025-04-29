from flask import Flask, render_template, request, jsonify
from PIL import Image, ImageOps, ImageDraw, ImageFont, ImageEnhance
import os
import base64
import smtplib
import ssl
from email.message import EmailMessage
from io import BytesIO
import re

app = Flask(__name__)

# Email configuration
SENDER_EMAIL = "vintage.photobooth.webapp@gmail.com"
SENDER_PASSWORD = "jamm ttsp gvxn rmip"
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 465

def enhance_image(img):
    """Apply contrast enhancement and black & white vintage filter."""
    # Convert to black and white with a vintage look
    img = img.convert('L')  # Convert to grayscale
    enhancer = ImageEnhance.Contrast(img)
    img = enhancer.enhance(1.5)
    # Add sepia tone for vintage effect
    sepia = []
    for pixel in img.getdata():
        r = int(pixel * 0.9)
        g = int(pixel * 0.7)
        b = int(pixel * 0.4)
        sepia.append((r, g, b))
    img = img.convert('RGB')
    img.putdata(sepia)
    return img

@app.route('/')
def home():
    return render_template('index.html')

def validate_email(email):
    """Basic regex validation for email."""
    email_regex = r"(^[\w\.\+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$)"
    return re.match(email_regex, email) is not None

@app.route('/capture', methods=['POST'])
def capture():
    data = request.json
    photos = data.get('photos')
    email = data.get('email')
    custom_text = data.get('custom_text', 'Vintage Memories')
    apply_filter = data.get('apply_filter', False)  # Default to False to match client-side

    if not photos:
        return jsonify({'error': 'No photos provided'}), 400

    images = []
    for img_data in photos:
        try:
            img_bytes = base64.b64decode(img_data.split(',')[1])
            img = Image.open(BytesIO(img_bytes)).convert('RGB')
            if apply_filter:  # Only apply filter if requested
                img = enhance_image(img)
            images.append(img)
        except Exception as e:
            return jsonify({'error': f"Failed to decode image: {str(e)}"}), 400

    # Create photo strip
    strip = Image.new('RGB', (320, 3 * 410), (243, 229, 171))
    for idx, img in enumerate(images):
        img = img.resize((300, 400))
        strip.paste(img, (10, idx * 410 + 5))
    bordered_strip = ImageOps.expand(strip, border=10, fill='gold')

    draw = ImageDraw.Draw(bordered_strip)
    try:
        font = ImageFont.truetype("arial.ttf", size=28)
    except:
        font = ImageFont.load_default()
    text = f"{custom_text} 🎉"  # Now uses user-provided text
    text_bbox = draw.textbbox((0, 0), text, font=font)
    text_width = text_bbox[2] - text_bbox[0]
    position = ((bordered_strip.width - text_width) // 2, bordered_strip.height - 40)
    draw.text(position, text, (255, 215, 0), font=font)

    # Save to memory
    img_bytes_io = BytesIO()
    bordered_strip.save(img_bytes_io, format='PNG')
    img_bytes_io.seek(0)

    # Email validation and sending logic
    if email:
        if not validate_email(email):
            return jsonify({'error': 'Invalid email address'}), 400
        try:
            send_email(email, img_bytes_io)
        except Exception as e:
            return jsonify({'error': f"Failed to send email: {str(e)}"}), 500

    return jsonify({'success': True})

def send_email(receiver_email, img_bytes_io):
    msg = EmailMessage()
    msg['Subject'] = 'Your Vintage Photobooth Strip 🎞'
    msg['From'] = SENDER_EMAIL
    msg['To'] = receiver_email
    msg.set_content('Thank you for using the Vintage Party Photobooth! Find your photo strip attached.')

    img_bytes_io.seek(0)
    file_data = img_bytes_io.read()

    msg.add_attachment(file_data, maintype='image', subtype='png', filename='vintage_strip.png')

    context = ssl.create_default_context()
    with smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT, context=context) as server:
        server.login(SENDER_EMAIL, SENDER_PASSWORD)
        server.send_message(msg)

if __name__ == "__main__":
    app.run(debug=True)
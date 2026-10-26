import os
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import cv2

media_dir = os.path.join("public", "assets", "sample-media")
os.makedirs(media_dir, exist_ok=True)

def create_gradient_image(width, height, top_color, bottom_color, noise=0.03):
    """Generate smooth vertical gradient with subtle film grain"""
    img = Image.new('RGB', (width, height))
    draw = ImageDraw.Draw(img)
    for y in range(height):
        r = int(top_color[0] + (bottom_color[0] - top_color[0]) * (y / height))
        g = int(top_color[1] + (bottom_color[1] - top_color[1]) * (y / height))
        b = int(top_color[2] + (bottom_color[2] - top_color[2]) * (y / height))
        draw.line([(0, y), (width, y)], fill=(r, g, b))
    return img

def add_mountains_and_silhouette(width, height, is_wide=True):
    # Top sky gradient (misty blue-gray)
    img = create_gradient_image(width, height, (180, 195, 210), (90, 115, 135))
    draw = ImageDraw.Draw(img, 'RGBA')
    
    # Layer 1: distant hazy mountain peaks
    points1 = [(0, int(height * 0.45))]
    for x in range(0, width + 40, 40):
        y = int(height * 0.42 + 25 * math.sin(x * 0.008) + 15 * math.cos(x * 0.02))
        points1.append((x, y))
    points1.extend([(width, height), (0, height)])
    draw.polygon(points1, fill=(130, 150, 170, 160))
    
    # Layer 2: middle mountain ridge
    points2 = [(0, int(height * 0.55))]
    for x in range(0, width + 30, 30):
        y = int(height * 0.52 + 35 * math.sin(x * 0.012 + 1) + 20 * math.sin(x * 0.03))
        points2.append((x, y))
    points2.extend([(width, height), (0, height)])
    draw.polygon(points2, fill=(70, 90, 110, 200))
    
    # Layer 3: foreground dark crag
    points3 = [(0, int(height * 0.7))]
    for x in range(0, width + 20, 20):
        y = int(height * 0.68 + 40 * math.sin(x * 0.015 + 2) + 15 * math.cos(x * 0.04))
        points3.append((x, y))
    points3.extend([(width, height), (0, height)])
    draw.polygon(points3, fill=(30, 40, 50, 255))
    
    # Silhouette: Photographer or Hiker sitting on a rock
    center_x = int(width * 0.68) if is_wide else int(width * 0.5)
    base_y = int(height * 0.72)
    # Rock base
    draw.ellipse([center_x - 45, base_y - 20, center_x + 45, base_y + 40], fill=(20, 25, 32, 255))
    # Body sitting
    draw.rectangle([center_x - 14, base_y - 48, center_x + 12, base_y - 12], fill=(15, 20, 28, 255))
    # Head with beanie
    draw.ellipse([center_x - 8, base_y - 68, center_x + 8, base_y - 48], fill=(15, 20, 28, 255))
    # Tripod/Camera
    draw.line([center_x + 8, base_y - 46, center_x + 28, base_y - 44], fill=(15, 20, 28, 255), width=4)
    draw.line([center_x + 28, base_y - 44, center_x + 22, base_y - 10], fill=(15, 20, 28, 255), width=2)
    draw.line([center_x + 28, base_y - 44, center_x + 36, base_y - 10], fill=(15, 20, 28, 255), width=2)
    
    # Atmospheric mist blur
    img = img.filter(ImageFilter.SMOOTH_MORE)
    return img

def create_cliff_jump(width, height):
    # Vibrant sunset/sky gradient: sky blue down to warm cliff tones
    img = create_gradient_image(width, height, (160, 200, 230), (220, 180, 140))
    draw = ImageDraw.Draw(img, 'RGBA')
    
    # Left rocky cliff
    cliff_left = [(0, 0), (int(width * 0.35), 0), (int(width * 0.28), int(height * 0.5)), (int(width * 0.4), height), (0, height)]
    draw.polygon(cliff_left, fill=(140, 95, 75, 255))
    
    # Right cliff base
    cliff_right = [(int(width * 0.72), int(height * 0.6)), (width, int(height * 0.55)), (width, height), (int(width * 0.65), height)]
    draw.polygon(cliff_right, fill=(120, 80, 65, 255))
    
    # Silhouette: person jumping in air (arms spread, legs bent)
    jx = int(width * 0.48)
    jy = int(height * 0.42)
    # Head
    draw.ellipse([jx - 7, jy - 35, jx + 7, jy - 21], fill=(40, 35, 45, 255))
    # Torso
    draw.line([jx, jy - 21, jx + 2, jy], fill=(40, 35, 45, 255), width=7)
    # Arms outstretched
    draw.line([jx - 25, jy - 28, jx + 25, jy - 15], fill=(40, 35, 45, 255), width=4)
    # Legs jumping
    draw.line([jx, jy, jx - 18, jy + 25], fill=(40, 35, 45, 255), width=5)
    draw.line([jx, jy, jx + 14, jy + 28], fill=(40, 35, 45, 255), width=5)
    
    return img

def create_hiker_valley(width, height):
    # Misty deep blue landscape
    img = create_gradient_image(width, height, (120, 160, 190), (45, 70, 95))
    draw = ImageDraw.Draw(img, 'RGBA')
    
    # Distant ridges
    for i in range(4):
        offset_y = int(height * (0.35 + i * 0.12))
        pts = [(0, offset_y)]
        for x in range(0, width + 30, 30):
            pts.append((x, int(offset_y + 20 * math.sin(x * 0.02 + i) + 10 * math.cos(x * 0.04))))
        pts.extend([(width, height), (0, height)])
        alpha = 80 + i * 40
        shade = 80 - i * 15
        draw.polygon(pts, fill=(shade, shade + 15, shade + 35, alpha))
    
    # Hiker silhouette on right ridge
    hx = int(width * 0.65)
    hy = int(height * 0.68)
    # Rock
    draw.polygon([(hx - 30, height), (hx - 10, hy + 20), (width, hy + 10), (width, height)], fill=(25, 35, 45, 255))
    # Body with backpack
    draw.rectangle([hx - 8, hy - 40, hx + 10, hy + 15], fill=(15, 20, 28, 255))
    draw.rectangle([hx - 16, hy - 36, hx - 8, hy - 5], fill=(25, 30, 40, 255)) # Backpack
    # Head
    draw.ellipse([hx - 6, hy - 55, hx + 8, hy - 40], fill=(15, 20, 28, 255))
    # Walking stick
    draw.line([hx + 18, hy - 35, hx + 16, hy + 22], fill=(15, 20, 28, 255), width=2)
    
    return img

def create_timeline_thumbnail(kind, width=200, height=160):
    if kind == "camper":
        img = create_gradient_image(width, height, (40, 60, 85), (20, 30, 45))
        draw = ImageDraw.Draw(img, 'RGBA')
        # Pine trees in background
        for tx in [20, 45, 70, 140, 175]:
            draw.polygon([(tx, 40), (tx - 18, 110), (tx + 18, 110)], fill=(15, 30, 20, 220))
        # Warm camper van
        draw.rounded_rectangle([60, 65, 145, 115], radius=8, fill=(240, 235, 220, 255))
        draw.rectangle([70, 75, 100, 90], fill=(255, 210, 120, 255)) # Warm glowing window
        draw.rectangle([110, 75, 135, 90], fill=(255, 210, 120, 255))
        # Wheels
        draw.ellipse([75, 105, 95, 125], fill=(30, 30, 30, 255))
        draw.ellipse([115, 105, 135, 125], fill=(30, 30, 30, 255))
    elif kind == "river":
        img = create_gradient_image(width, height, (140, 175, 195), (60, 90, 80))
        draw = ImageDraw.Draw(img, 'RGBA')
        # River flowing down center
        river_pts = [(int(width * 0.48), 50), (int(width * 0.54), 50), (int(width * 0.7), height), (int(width * 0.3), height)]
        draw.polygon(river_pts, fill=(180, 220, 235, 255))
        # Forest flanks
        draw.polygon([(0, 40), (int(width * 0.45), 50), (int(width * 0.25), height), (0, height)], fill=(40, 65, 50, 255))
        draw.polygon([(width, 40), (int(width * 0.56), 50), (int(width * 0.75), height), (width, height)], fill=(40, 65, 50, 255))
    else: # sunset tent
        img = create_gradient_image(width, height, (230, 150, 110), (120, 70, 90))
        draw = ImageDraw.Draw(img, 'RGBA')
        # Sun setting
        draw.ellipse([width // 2 - 25, 30, width // 2 + 25, 80], fill=(255, 240, 180, 240))
        # Mountain ridge
        draw.polygon([(0, 95), (80, 75), (140, 90), (width, 80), (width, height), (0, height)], fill=(50, 35, 45, 255))
        # Cozy tent
        draw.polygon([(110, 85), (145, 60), (175, 95)], fill=(245, 180, 60, 255))
        draw.polygon([(130, 85), (145, 60), (160, 90)], fill=(255, 225, 120, 255))
    return img

print("Generating Preview Cards...")
# 1. Happiness & Tears (Wide: 600x380)
card1 = add_mountains_and_silhouette(600, 380, is_wide=True)
card1.save(os.path.join(media_dir, "happiness-tears.jpg"), quality=92)

# 2. High Hopes (Portrait: 360x480)
card2 = create_cliff_jump(360, 480)
card2.save(os.path.join(media_dir, "high-hopes.jpg"), quality=92)

# 3. Imaginary you (Portrait: 360x480)
card3 = create_hiker_valley(360, 480)
card3.save(os.path.join(media_dir, "imaginary-you.jpg"), quality=92)

# 4. Timeline Thumbnails (240x200)
t1 = create_timeline_thumbnail("camper", 240, 200)
t1.save(os.path.join(media_dir, "timeline-1.jpg"), quality=90)

t2 = create_timeline_thumbnail("river", 240, 200)
t2.save(os.path.join(media_dir, "timeline-2.jpg"), quality=90)

t3 = create_timeline_thumbnail("tent", 240, 200)
t3.save(os.path.join(media_dir, "timeline-3.jpg"), quality=90)

print("Generating Sample Video (Glitter.mp4)...")
# Generate Glitter.mp4 using OpenCV
video_path = os.path.join(media_dir, "glitter.mp4")
fourcc = cv2.VideoWriter_fourcc(*'mp4v')
fps = 24
duration_sec = 4
width, height = 640, 360
out = cv2.VideoWriter(video_path, fourcc, fps, (width, height))

for f in range(fps * duration_sec):
    t = f / fps
    frame = np.zeros((height, width, 3), dtype=np.uint8)
    
    # Smooth moving gradient background (blue / indigo / cyan)
    for y in range(0, height, 4):
        val = int(127 + 100 * math.sin(t * 1.5 + y * 0.02))
        val2 = int(100 + 80 * math.cos(t * 1.2 + y * 0.015))
        frame[y:y+4, :] = [val, 70, val2]
        
    # Floating ambient particles
    for p in range(25):
        px = int((p * 77 + t * 45) % width)
        py = int((p * 43 + 30 * math.sin(t * 2 + p)) % height)
        radius = int(3 + 2 * math.sin(t * 3 + p))
        cv2.circle(frame, (px, py), radius, (255, 255, 220), -1)
        
    # Title overlay
    cv2.putText(frame, "MyDocs Media Stream", (width // 2 - 130, height // 2 - 10),
                cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2, cv2.LINE_AA)
    cv2.putText(frame, "Sample High Definition Video", (width // 2 - 110, height // 2 + 25),
                cv2.FONT_HERSHEY_SIMPLEX, 0.45, (200, 220, 255), 1, cv2.LINE_AA)
    
    out.write(frame)

out.release()
print("Sample media generated successfully!")

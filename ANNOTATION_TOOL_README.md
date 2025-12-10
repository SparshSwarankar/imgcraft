# Image Annotation Tool - Implementation Guide

## Overview
Professional image annotation tool integrated into ImgCraft. This premium tool allows users to create bounding boxes, polygons, and point markers on images, with full metadata management and JSON export/import capabilities.

## Cost: 6 Credits per session

## Features Implemented

### 1. Drawing Tools
- **Rectangle Tool**: Draw bounding boxes for object detection
- **Polygon Tool**: Create custom polygon regions (double-click to finish)
- **Point Tool**: Add point markers for landmarks or specific features
- **Select Tool**: Move and edit existing annotations

### 2. Annotation Management
- Label/tag each annotation with custom names
- Assign colors to annotations for visual distinction
- Edit, move, resize, and delete annotations
- Select annotations from the list or canvas

### 3. Metadata System
- Global image metadata (title, description, tags)
- Per-annotation metadata (label, color, coordinates)
- All metadata included in JSON export

### 4. Export/Import
- **Export**: Save all annotations and metadata as JSON
- **Import**: Load previously saved annotation files
- JSON structure designed for AI/ML workflows (computer vision, object detection, etc.)

### 5. Canvas Controls
- Zoom in/out functionality
- Reset zoom to original size
- Change image (clears current annotations with confirmation)
- Responsive canvas that scales to fit container

### 6. Credit System Integration
- Fully integrated with Supabase credit system
- Deducts 6 credits on first image upload
- Auth check before allowing usage
- Redirects to billing if insufficient credits

### 7. UI/UX Features
- Premium card styling with gold accents
- Three-panel studio layout (left: tools, center: canvas, right: annotations list)
- Real-time annotation counter
- Visual feedback for selected annotations
- Toast notifications for all actions
- Drag-and-drop image upload
- Responsive design for all screen sizes

## File Structure

```
ImgCraft/
├── templates/
│   └── annotation.html          # Main HTML template
├── static/
│   ├── css/
│   │   └── annotation.css       # Tool-specific styles
│   └── js/
│       └── annotation.js        # Fabric.js-based annotation logic
├── database/
│   ├── setup.sql               # Updated with annotation tool config
│   └── migrations/
│       └── add_annotation_tool.sql  # Migration file
└── app.py                      # Flask route added
```

## JSON Export Format

```json
{
  "imageName": "example.jpg",
  "imageWidth": 1920,
  "imageHeight": 1080,
  "metadata": {
    "title": "Sample Image",
    "description": "Description here",
    "tags": ["tag1", "tag2"]
  },
  "annotations": [
    {
      "id": 1,
      "type": "rectangle",
      "label": "Person",
      "color": "#F97316",
      "coords": {
        "x": 100,
        "y": 150,
        "width": 200,
        "height": 300
      }
    },
    {
      "id": 2,
      "type": "polygon",
      "label": "Car",
      "color": "#22C55E",
      "points": [
        {"x": 50, "y": 50},
        {"x": 150, "y": 50},
        {"x": 100, "y": 150}
      ]
    },
    {
      "id": 3,
      "type": "point",
      "label": "Landmark",
      "color": "#3B82F6",
      "coords": {"x": 500, "y": 300}
    }
  ],
  "exportDate": "2025-12-11T...",
  "tool": "ImgCraft Annotation Tool v1.0"
}
```

## Libraries Used

### Fabric.js (v5.3.0)
- **Purpose**: Canvas manipulation and object management
- **CDN**: `https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.0/fabric.min.js`
- **Usage**: Handles all drawing, selection, and transformation of annotations

### FileSaver.js (v2.0.5)
- **Purpose**: Client-side file saving
- **CDN**: `https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js`
- **Usage**: Exports JSON data as downloadable files

## Integration Points

### 1. Authentication (AuthManager)
- Checks user session before allowing tool usage
- Redirects to /auth if not logged in
- Uses Supabase JWT tokens for API calls

### 2. Credit System (CreditManager)
- Deducts 6 credits via `/api/credits/deduct` endpoint
- Displays remaining credits in header
- Blocks usage if insufficient credits
- Redirects to /billing page when needed

### 3. Toast Notifications
- Success: Green notifications for successful actions
- Error: Red notifications for failures
- Warning: Yellow notifications for warnings
- Info: Blue notifications for information

### 4. Modal System
- Reuses existing modal infrastructure
- No new modals required for this tool
- Confirmation dialogs use browser confirm() for simplicity

## Database Integration

The annotation tool is registered in the `tool_config` table:

```sql
tool_name: 'annotation'
display_name: 'Image Annotation'
credit_cost: 6
description: 'Professional annotation with bounding boxes, polygons, and metadata export'
is_active: true
```

To apply the database change, run the migration:
```bash
# In Supabase SQL Editor, run:
database/migrations/add_annotation_tool.sql
```

Or update existing installations:
```sql
INSERT INTO tool_config (tool_name, display_name, credit_cost, description, is_active)
VALUES ('annotation', 'Image Annotation', 6, 'Professional annotation with bounding boxes, polygons, and metadata export', true)
ON CONFLICT (tool_name) DO UPDATE SET credit_cost = 6, updated_at = NOW();
```

## User Workflow

1. **Navigate**: User clicks "AI Annotation Studio" from homepage
2. **Auth Check**: System verifies user is logged in
3. **Upload**: User uploads image via drag-drop or file picker
4. **Credit Deduction**: 6 credits deducted automatically
5. **Annotate**: User draws annotations using tools
6. **Tag**: User labels each annotation with custom names
7. **Metadata**: User adds global image metadata (optional)
8. **Export**: User exports all data as JSON
9. **Import**: User can import previously saved annotations (optional)

## EXIF Tool Integration

The tool includes a helpful link to the existing EXIF tool:
- Located in the left panel under "Helper Info"
- Encourages users to check full EXIF metadata separately
- Does not duplicate EXIF functionality

## Responsive Design

### Desktop (>992px)
- Three-panel layout: 320px | flex | 320px
- Full feature set visible
- Optimal annotation experience

### Tablet (768px - 992px)
- Stacked layout: Tools → Canvas → List
- All features accessible
- Reduced panel heights

### Mobile (<768px)
- Vertical stacking
- Condensed tool buttons (2 columns)
- Touch-optimized controls
- Reduced canvas height (60vh)

## Browser Compatibility

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support (with -webkit prefixes)
- Mobile browsers: Touch-optimized

## Security & Privacy

- **Client-side processing**: All annotation happens in browser
- **No image upload to server**: Images never leave user's device for annotation
- **Secure credit system**: Server-side validation via Supabase
- **CORS-safe**: Uses Supabase ANON key (public operations only)

## Performance Considerations

- Canvas auto-scales large images to fit viewport
- Maximum zoom: 3x
- Minimum zoom: 0.5x
- Efficient rendering with Fabric.js's built-in optimizations
- Annotations stored in memory (no database storage)

## Future Enhancement Ideas

1. **Advanced Shapes**: Add circle, ellipse, freehand drawing
2. **Attributes**: Custom key-value pairs per annotation
3. **Categories**: Predefined label categories
4. **Keyboard Shortcuts**: Quick tool switching (R, P, S, etc.)
5. **Undo/Redo**: History stack for annotations
6. **Multi-image**: Batch annotation workflow
7. **Export Formats**: COCO, YOLO, Pascal VOC formats
8. **Image Segmentation**: Mask export for advanced ML workflows
9. **Collaboration**: Share annotation projects
10. **Templates**: Save/load annotation templates

## Testing Checklist

- [x] Image upload (drag & drop and file picker)
- [x] Rectangle drawing and editing
- [x] Polygon drawing (multi-point)
- [x] Point marker placement
- [x] Annotation selection from canvas
- [x] Annotation selection from list
- [x] Label editing
- [x] Color editing
- [x] Annotation deletion
- [x] Metadata input (title, description, tags)
- [x] JSON export with correct structure
- [x] JSON import with annotation recreation
- [x] Zoom controls
- [x] Change image functionality
- [x] Credit deduction on upload
- [x] Auth redirect for non-logged users
- [x] Low credits redirect to billing
- [x] Toast notifications
- [x] Responsive layout
- [x] Premium card styling
- [x] Navigation integration

## Support & Troubleshooting

### Common Issues

**Q: Annotations disappear after zoom**
A: This is expected behavior - zoom is visual only. Annotations remain in the same coordinates.

**Q: Polygon not finishing**
A: Double-click to finish polygon drawing. Must have at least 3 points.

**Q: Import fails with "invalid JSON"**
A: Ensure the JSON file was exported from ImgCraft annotation tool. Check file structure.

**Q: Credits deducted but can't annotate**
A: Refresh the page. If issue persists, check browser console for errors.

**Q: Image too small/large on canvas**
A: Use zoom controls or the tool auto-scales images to fit. Original size preserved in export.

## Credits

- **Developer**: ImgCraft Team
- **Framework**: Flask + Fabric.js
- **Design**: Following ImgCraft design system
- **Version**: 1.0.0
- **Release Date**: December 11, 2025

---

**Need Help?** Contact support or check the main ImgCraft documentation.

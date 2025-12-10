# Quick Setup Guide - Annotation Tool

## Step 1: Database Setup

Run the following SQL in your Supabase SQL Editor to add the annotation tool to your database:

```sql
-- Add annotation tool configuration
INSERT INTO tool_config (
    tool_name,
    display_name,
    credit_cost,
    description,
    is_active
)
VALUES (
    'annotation',
    'Image Annotation',
    6,
    'Professional annotation with bounding boxes, polygons, and metadata export',
    true
)
ON CONFLICT (tool_name) 
DO UPDATE SET
    credit_cost = 6,
    description = 'Professional annotation with bounding boxes, polygons, and metadata export',
    is_active = true,
    updated_at = NOW();
```

Or use the migration file:
```bash
# Navigate to database/migrations/
# Copy contents of add_annotation_tool.sql
# Paste and run in Supabase SQL Editor
```

## Step 2: Verify Files

Ensure these new files exist:
- ✅ `templates/annotation.html`
- ✅ `static/css/annotation.css`
- ✅ `static/js/annotation.js`
- ✅ `database/migrations/add_annotation_tool.sql`

## Step 3: Verify Code Changes

Check these files were updated:
- ✅ `app.py` - Route `/annotation` added
- ✅ `templates/index.html` - Premium card added to tools grid
- ✅ `database/setup.sql` - Annotation tool config added

## Step 4: Test the Integration

1. Start your Flask server:
   ```bash
   python app.py
   ```

2. Navigate to homepage: `http://localhost:5000`

3. Find the "AI Annotation Studio" premium card in the tools grid

4. Click to open the annotation tool

5. Login if prompted

6. Upload an image (should deduct 6 credits)

7. Test all features:
   - Draw rectangles
   - Draw polygons (double-click to finish)
   - Add point markers
   - Label annotations
   - Change colors
   - Export to JSON
   - Import JSON file

## Step 5: Verify Credit System

1. Check user has enough credits (6+ required)
2. Upload image - should see "6 credits deducted" toast
3. Check header - credit count should decrease by 6
4. Try with low credits - should redirect to billing page

## Troubleshooting

### Issue: "Tool not found" or 404 error
**Solution**: Restart Flask server after adding the route

### Issue: Credits not deducting
**Solution**: 
1. Check Supabase connection
2. Verify tool_config table has 'annotation' entry
3. Check browser console for API errors

### Issue: Libraries not loading (Fabric.js, FileSaver.js)
**Solution**: 
1. Check internet connection (CDN links required)
2. Open browser DevTools > Network tab
3. Verify CDN files loaded successfully

### Issue: Premium styling not showing
**Solution**:
1. Clear browser cache
2. Hard refresh (Ctrl+F5 or Cmd+Shift+R)
3. Check annotation.css is loaded

### Issue: Annotations not appearing
**Solution**:
1. Check browser console for JavaScript errors
2. Verify Fabric.js loaded correctly
3. Try different image format (PNG, JPG, WebP)

## Features Checklist

After setup, verify these features work:

### Drawing Tools
- [ ] Rectangle tool creates bounding boxes
- [ ] Polygon tool creates multi-point shapes
- [ ] Point tool places markers
- [ ] Select tool enables editing

### Annotation Management
- [ ] Click annotation to select
- [ ] Edit label text
- [ ] Change annotation color
- [ ] Delete annotations

### Export/Import
- [ ] Export creates valid JSON file
- [ ] Import loads annotations correctly
- [ ] Metadata included in export

### Canvas Controls
- [ ] Zoom in/out works
- [ ] Reset zoom to 100%
- [ ] Change image (with confirmation)

### Credit System
- [ ] 6 credits deducted on upload
- [ ] Credit balance updates in header
- [ ] Insufficient credits blocks usage
- [ ] Redirects to billing page

### UI/UX
- [ ] Premium card shows on homepage
- [ ] Gold/orange premium styling
- [ ] Toast notifications appear
- [ ] Responsive on mobile
- [ ] EXIF tool link present

## Production Deployment

Before deploying to production:

1. **Run Database Migration**
   ```sql
   -- In production Supabase instance
   -- Run add_annotation_tool.sql
   ```

2. **Verify CDN Links**
   - Fabric.js: https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.0/fabric.min.js
   - FileSaver.js: https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js

3. **Test on Staging**
   - Full user workflow
   - Credit deduction
   - Export/import
   - Different browsers

4. **Update Documentation**
   - Add to user guide
   - Update pricing page
   - Announce new feature

5. **Monitor**
   - Check error logs
   - Monitor credit transactions
   - Watch for support tickets

## Success Criteria

✅ Tool appears on homepage with premium styling  
✅ Route `/annotation` is accessible  
✅ Database has annotation tool configured (6 credits)  
✅ Image upload deducts 6 credits  
✅ All drawing tools work (rectangle, polygon, point)  
✅ Export creates valid JSON with all data  
✅ Import recreates annotations from JSON  
✅ Toast notifications show for all actions  
✅ Responsive design works on mobile  
✅ EXIF tool link navigates correctly  

---

**Status**: ✅ Ready for Testing  
**Last Updated**: December 11, 2025  
**Version**: 1.0.0

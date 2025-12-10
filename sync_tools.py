"""
Tool Configuration Sync Script
Ensures all tools defined in Python are properly registered in Supabase tool_config table
This is the single source of truth for tool definitions
"""
import os
import sys
from dotenv import load_dotenv
from supabase import create_client, Client
from typing import Dict, List
import logging

# Load environment variables
load_dotenv()

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Tool definitions - This is the master list
# All tools must be defined here with their metadata
TOOL_DEFINITIONS = [
    {
        'tool_name': 'resize',
        'display_name': 'Image Resize',
        'credit_cost': 0,  # FREE tool
        'description': 'Resize images to custom dimensions',
        'is_active': True,
        'is_free': True
    },
    {
        'tool_name': 'compress',
        'display_name': 'Image Compress',
        'credit_cost': 2,
        'description': 'Compress images to reduce file size',
        'is_active': True,
        'is_free': False
    },
    {
        'tool_name': 'convert',
        'display_name': 'Format Convert',
        'credit_cost': 0,  # FREE tool
        'description': 'Convert images between different formats',
        'is_active': True,
        'is_free': True
    },
    {
        'tool_name': 'crop',
        'display_name': 'Image Crop',
        'credit_cost': 1,
        'description': 'Crop images to custom dimensions',
        'is_active': True,
        'is_free': False
    },
    {
        'tool_name': 'palette',
        'display_name': 'Color Palette',
        'credit_cost': 2,
        'description': 'Extract color palette from images',
        'is_active': True,
        'is_free': False
    },
    {
        'tool_name': 'watermark',
        'display_name': 'Add Watermark',
        'credit_cost': 3,
        'description': 'Add text or image watermarks',
        'is_active': True,
        'is_free': False
    },
    {
        'tool_name': 'remove_bg',
        'display_name': 'Remove Background',
        'credit_cost': 10,
        'description': 'AI-powered background removal',
        'is_active': True,
        'is_free': False
    },
    {
        'tool_name': 'exif',
        'display_name': 'EXIF Data',
        'credit_cost': 1,
        'description': 'View and edit image metadata',
        'is_active': True,
        'is_free': False
    },
    {
        'tool_name': 'filter',
        'display_name': 'Image Filter',
        'credit_cost': 2,
        'description': 'Apply filters and effects',
        'is_active': True,
        'is_free': False
    },
    {
        'tool_name': 'upscale',
        'display_name': 'Image Upscale',
        'credit_cost': 8,
        'description': 'AI-powered image upscaling',
        'is_active': True,
        'is_free': False
    },
    {
        'tool_name': 'collage',
        'display_name': 'AI Collage Generator',
        'credit_cost': 13,
        'description': 'AI-powered photo collage with automatic layout selection',
        'is_active': True,
        'is_free': False
    },
    {
        'tool_name': 'annotation',
        'display_name': 'AI Annotation Studio',
        'credit_cost': 15,
        'description': 'Professional annotation with bounding boxes, polygons, and metadata export',
        'is_active': True,
        'is_free': False
    }
]


def get_supabase_client() -> Client:
    """Initialize and return Supabase client"""
    url = os.getenv('SUPABASE_URL')
    key = os.getenv('SUPABASE_SERVICE_KEY')  # Use service key for admin operations
    
    if not url or not key:
        raise ValueError(
            "Missing Supabase configuration. "
            "Please set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env file"
        )
    
    return create_client(url, key)


def fetch_existing_tools(supabase: Client) -> Dict[str, dict]:
    """Fetch all existing tools from Supabase"""
    try:
        response = supabase.table('tool_config').select('*').execute()
        tools_dict = {tool['tool_name']: tool for tool in response.data}
        logger.info(f"Fetched {len(tools_dict)} existing tools from Supabase")
        return tools_dict
    except Exception as e:
        logger.error(f"Failed to fetch existing tools: {str(e)}")
        return {}


def sync_tools(supabase: Client, dry_run: bool = False) -> dict:
    """
    Sync tool definitions to Supabase
    
    Args:
        supabase: Supabase client
        dry_run: If True, only show what would be done without making changes
    
    Returns:
        Dictionary with sync statistics
    """
    stats = {
        'total_tools': len(TOOL_DEFINITIONS),
        'inserted': 0,
        'updated': 0,
        'unchanged': 0,
        'errors': 0,
        'details': []
    }
    
    # Fetch existing tools
    existing_tools = fetch_existing_tools(supabase)
    
    # Process each tool definition
    for tool_def in TOOL_DEFINITIONS:
        tool_name = tool_def['tool_name']
        
        try:
            if tool_name in existing_tools:
                # Tool exists - check if update is needed
                existing = existing_tools[tool_name]
                needs_update = False
                changes = []
                
                # Compare each field
                for key in ['display_name', 'credit_cost', 'description', 'is_active']:
                    if existing.get(key) != tool_def.get(key):
                        needs_update = True
                        changes.append(f"{key}: {existing.get(key)} → {tool_def.get(key)}")
                
                if needs_update:
                    if dry_run:
                        logger.info(f"[DRY RUN] Would update '{tool_name}': {', '.join(changes)}")
                    else:
                        # Update the tool
                        update_data = {k: v for k, v in tool_def.items() if k != 'tool_name' and k != 'is_free'}
                        supabase.table('tool_config').update(update_data).eq('tool_name', tool_name).execute()
                        logger.info(f"✓ Updated '{tool_name}': {', '.join(changes)}")
                    
                    stats['updated'] += 1
                    stats['details'].append({
                        'tool': tool_name,
                        'action': 'updated',
                        'changes': changes
                    })
                else:
                    logger.debug(f"  '{tool_name}' is up to date")
                    stats['unchanged'] += 1
            else:
                # Tool doesn't exist - insert it
                if dry_run:
                    logger.info(f"[DRY RUN] Would insert new tool '{tool_name}' with cost {tool_def['credit_cost']}")
                else:
                    insert_data = {k: v for k, v in tool_def.items() if k != 'is_free'}
                    supabase.table('tool_config').insert(insert_data).execute()
                    logger.info(f"✓ Inserted new tool '{tool_name}' with cost {tool_def['credit_cost']}")
                
                stats['inserted'] += 1
                stats['details'].append({
                    'tool': tool_name,
                    'action': 'inserted',
                    'cost': tool_def['credit_cost']
                })
        
        except Exception as e:
            logger.error(f"✗ Error processing '{tool_name}': {str(e)}")
            stats['errors'] += 1
            stats['details'].append({
                'tool': tool_name,
                'action': 'error',
                'error': str(e)
            })
    
    return stats


def validate_sync(supabase: Client) -> bool:
    """Validate that all tools are properly synced"""
    try:
        existing_tools = fetch_existing_tools(supabase)
        
        all_valid = True
        for tool_def in TOOL_DEFINITIONS:
            tool_name = tool_def['tool_name']
            if tool_name not in existing_tools:
                logger.error(f"✗ Tool '{tool_name}' is missing from Supabase!")
                all_valid = False
            else:
                existing = existing_tools[tool_name]
                if existing['credit_cost'] != tool_def['credit_cost']:
                    logger.warning(
                        f"⚠ Cost mismatch for '{tool_name}': "
                        f"DB={existing['credit_cost']}, Code={tool_def['credit_cost']}"
                    )
                    all_valid = False
        
        return all_valid
    except Exception as e:
        logger.error(f"Validation failed: {str(e)}")
        return False


def main():
    """Main sync function"""
    print("=" * 80)
    print("ImgCraft Tool Configuration Sync")
    print("=" * 80)
    print()
    
    # Check command line arguments
    dry_run = '--dry-run' in sys.argv
    validate_only = '--validate' in sys.argv
    
    if dry_run:
        print("🔍 DRY RUN MODE - No changes will be made")
        print()
    
    try:
        # Initialize Supabase client
        logger.info("Connecting to Supabase...")
        supabase = get_supabase_client()
        logger.info("✓ Connected to Supabase")
        print()
        
        if validate_only:
            # Only validate
            print("Validating tool configuration...")
            print()
            is_valid = validate_sync(supabase)
            print()
            if is_valid:
                print("✅ All tools are properly synced!")
                return 0
            else:
                print("❌ Tool configuration has mismatches. Run sync to fix.")
                return 1
        else:
            # Perform sync
            print(f"Syncing {len(TOOL_DEFINITIONS)} tool definitions...")
            print()
            stats = sync_tools(supabase, dry_run=dry_run)
            
            # Print summary
            print()
            print("=" * 80)
            print("Sync Summary")
            print("=" * 80)
            print(f"Total tools:     {stats['total_tools']}")
            print(f"Inserted:        {stats['inserted']}")
            print(f"Updated:         {stats['updated']}")
            print(f"Unchanged:       {stats['unchanged']}")
            print(f"Errors:          {stats['errors']}")
            print("=" * 80)
            
            if stats['errors'] > 0:
                print()
                print("⚠️  Some errors occurred during sync. Check logs above.")
                return 1
            
            if not dry_run:
                # Validate after sync
                print()
                print("Validating sync...")
                is_valid = validate_sync(supabase)
                print()
                if is_valid:
                    print("✅ Tool sync completed successfully!")
                    return 0
                else:
                    print("⚠️  Validation found issues after sync.")
                    return 1
            else:
                print()
                print("✓ Dry run completed. Run without --dry-run to apply changes.")
                return 0
    
    except Exception as e:
        logger.error(f"Fatal error: {str(e)}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == '__main__':
    sys.exit(main())

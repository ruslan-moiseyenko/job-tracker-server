#!/usr/bin/env ts-node

import { writeFileSync } from 'fs';
import { join } from 'path';
import { APIDocumentationGenerator } from './src/common/utils/api-documentation.generator';

/**
 * Script to generate GraphQL API documentation
 */
function generateDocumentation() {
  console.log('🚀 Generating GraphQL API documentation...');

  try {
    // Ensure directories exist
    const docsDir = join(__dirname, 'docs');
    const typesDir = join(__dirname, 'src', 'types');

    // Generate markdown documentation
    const markdownDoc = APIDocumentationGenerator.generateGroupsDocumentation();
    const markdownPath = join(docsDir, 'api-groups-generated.md');
    writeFileSync(markdownPath, markdownDoc, 'utf-8');
    console.log(`📝 Generated markdown documentation: ${markdownPath}`);

    // Generate JSON schema
    const jsonSchema = APIDocumentationGenerator.generateGroupsSchema();
    const jsonPath = join(docsDir, 'api-groups-schema.json');
    writeFileSync(jsonPath, JSON.stringify(jsonSchema, null, 2), 'utf-8');
    console.log(`📋 Generated JSON schema: ${jsonPath}`);

    // Generate TypeScript interface
    const tsInterface = APIDocumentationGenerator.generateGroupsInterface();
    const tsPath = join(typesDir, 'api-groups.types.ts');
    writeFileSync(tsPath, tsInterface, 'utf-8');
    console.log(`🔧 Generated TypeScript interface: ${tsPath}`);

    console.log('✅ Documentation generation completed successfully!');
  } catch (error) {
    console.error('❌ Error generating documentation:', error);
    process.exit(1);
  }
}

// Run the script if called directly
if (require.main === module) {
  generateDocumentation();
}

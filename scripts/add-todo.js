#!/usr/bin/env node

/**
 * Quick script to add items to TODO.md
 * Usage: node scripts/add-todo.js "Fix login bug" high
 */

const fs = require('fs');
const path = require('path');

const todoFile = path.join(__dirname, '../TODO.md');
const args = process.argv.slice(2);

if (args.length < 2) {
  console.log('Usage: node scripts/add-todo.js "Task description" priority');
  console.log('Priority: high, medium, low');
  process.exit(1);
}

const [description, priority] = args;
const validPriorities = ['high', 'medium', 'low'];

if (!validPriorities.includes(priority.toLowerCase())) {
  console.error('Priority must be: high, medium, or low');
  process.exit(1);
}

const date = new Date().toISOString().split('T')[0];
const priorityEmoji = {
  high: '🚨',
  medium: '🔧', 
  low: '🎯'
}[priority.toLowerCase()];

const prioritySection = {
  high: '## 🚨 High Priority',
  medium: '## 🔧 Medium Priority',
  low: '## 🎯 Low Priority'
}[priority.toLowerCase()];

try {
  let content = fs.readFileSync(todoFile, 'utf8');
  
  // Find the appropriate section and add the item
  const sectionIndex = content.indexOf(prioritySection);
  if (sectionIndex === -1) {
    console.error(`Could not find ${prioritySection} section in TODO.md`);
    process.exit(1);
  }
  
  // Find the next section or end of file
  const nextSectionIndex = content.indexOf('\n## ', sectionIndex + prioritySection.length);
  const insertIndex = nextSectionIndex === -1 ? content.length : nextSectionIndex;
  
  const newItem = `- [ ] **${description}** _(${date})_\n`;
  
  const updatedContent = content.slice(0, insertIndex) + newItem + content.slice(insertIndex);
  
  fs.writeFileSync(todoFile, updatedContent);
  console.log(`${priorityEmoji} Added "${description}" to ${priority} priority section`);
  
} catch (error) {
  console.error('Error updating TODO.md:', error.message);
  process.exit(1);
}
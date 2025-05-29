# ASC-FDL Application Suite

This project creates a comprehensive application suite for the **ASC Framing Decision List (FDL)** - a standardized format developed by the American Society of Cinematographers for managing framing decisions across different viewing contexts in film and television production.

## Overview

The ASC-FDL Application Suite consists of three interconnected applications with consistent design and functionality:

1. **Web Application** (`web-app/`) - Browser-based FDL creation and editing
2. **macOS Application** (`macos-app/`) - Native offline FDL editing for Mac
3. **iOS Application** (`ios-app/`) - Mobile FDL creation and review

## What is an FDL?

A Framing Decision List (FDL) is a JSON file that describes how content should be framed across different viewing contexts (e.g., theatrical, television, streaming, mobile). It includes:

- **Framing Intents**: Different aspect ratios and framing requirements
- **Contexts**: Various viewing/delivery scenarios
- **Canvases**: Source material dimensions and properties
- **Framing Decisions**: Specific crop/frame instructions for each intent
- **Canvas Templates**: Output format specifications

## Project Structure

```
asc-fdl-project/
├── web-app/                    # React-based web application
├── macos-app/                  # Swift/SwiftUI macOS application  
├── ios-app/                    # Swift/SwiftUI iOS application
├── shared/                     # Shared resources and components
│   ├── types/                  # TypeScript/Swift type definitions
│   ├── validation/             # FDL validation logic
│   ├── assets/                 # Shared images, icons, logos
│   └── design-system/          # UI components and styling
├── validation/                 # Original ASC FDL validation tools
├── docs/                       # Documentation and specifications
└── README.md                   # This file
```

## Key Features

### Core Functionality
- **FDL Creation**: Intuitive forms for defining framing intents and contexts
- **Canvas Management**: Upload and define source canvas properties
- **Framing Decision Tools**: Visual tools for setting crop areas and anchor points
- **Template System**: Pre-configured canvas templates for common output formats
- **Real-time Validation**: Live validation against ASC FDL schema
- **Export/Import**: Save and load FDL files in standard JSON format

### User Experience
- **Consistent Design**: Unified UI/UX across all three platforms
- **Responsive Layout**: Adapts to different screen sizes and orientations
- **Dark/Light Modes**: Support for user preference themes
- **Accessibility**: Full keyboard navigation and screen reader support
- **Offline Support**: macOS and iOS apps work without internet connection

## Technology Stack

### Web Application
- **Frontend**: React 18+ with TypeScript
- **Styling**: Tailwind CSS with custom design system
- **State Management**: Zustand or Redux Toolkit
- **Validation**: JSON Schema validation with custom FDL rules
- **Build Tool**: Vite
- **Testing**: Jest + React Testing Library

### macOS Application
- **Language**: Swift 5.9+
- **Framework**: SwiftUI
- **Architecture**: MVVM with Combine
- **Data Persistence**: Core Data or SQLite
- **File Management**: NSDocument-based architecture

### iOS Application
- **Language**: Swift 5.9+
- **Framework**: SwiftUI
- **Architecture**: MVVM with Combine
- **Data Persistence**: Core Data with CloudKit sync
- **Camera Integration**: AVFoundation for framing preview

## Development Phases

### Phase 1: Web Application (Current)
- Set up React project with TypeScript
- Implement FDL data models and validation
- Create UI components for FDL editing
- Add export/import functionality
- Deploy as progressive web app

### Phase 2: macOS Application
- Create SwiftUI-based native application
- Port validation logic to Swift
- Implement document-based file handling
- Add advanced editing features

### Phase 3: iOS Application
- Develop mobile-optimized interface
- Add camera integration for framing preview
- Implement cloud sync capabilities
- Optimize for touch interactions

## Getting Started

See individual README files in each application directory for specific setup instructions:

- [Web App Setup](web-app/README.md)
- [macOS App Setup](macos-app/README.md)  
- [iOS App Setup](ios-app/README.md)

## ASC FDL Resources

- **Original Repository**: https://github.com/ascmitc/fdl.git
- **Specification**: [ASC FDL Specification v1.1](validation/ASCFDL_Specification_v1.1.pdf)
- **Sample Files**: [Google Drive Samples](https://drive.google.com/drive/folders/1L1opQmDl6qhAik2wx2NEVz7-xbSFQ-ns)
- **JSON Schema**: [ascfdl.schema.json](validation/ascfdl.schema.json)

## Contributing

This project follows the ASC FDL Specification v1.1. All contributions should maintain compatibility with the official schema and validation requirements.

## License

This project is developed to support the open ASC FDL standard. See individual application directories for specific licensing information. 
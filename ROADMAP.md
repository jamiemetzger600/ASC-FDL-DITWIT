# Project Roadmap & To-Do List

This document outlines planned features, improvements, and to-do items for the ASC-DIT-FDL application. We will use this checklist to track progress.

## Core Functionality & UX Enhancements

- [ ] **FDL Version Tracking:** Ensure that the application version is included in the FDL file under the `"version":` section. This will help users track issues related to specific app versions.
- [ ] **Intuitive Framing Intent Creation:** Redesign the UI/UX for creating Framing Intents to be highly intuitive and user-friendly. Technical information should be hidden by default and revealed upon user request (e.g., via a checkbox or dropdown), allowing users to focus on creating their FDL without technical distractions.
- [ ] **FDL Creator Information:** Automatically populate the `"fdl_creator"` field in the FDL with: `"ASC-DIT-FDL" Jamie Metzger [415]515]2841 - Jamiemetzger@gmail.com`.
- [ ] **Sample Images & User Uploads:** Incorporate sample images for framing reference, similar to the Arri Frameline Composer. Additionally, provide an option for users to upload their own custom images.
- [ ] **Re-enable Right-Hand Panels:** Uncomment and restore the "Validation Status", "FDL Summary", and "Quick Actions" panels in the UI when appropriate.
- [ ] **Re-enable Setup Label & Context Creator:** Uncomment and restore the "Setup Label" and "Context Creator" input fields in the Camera Setup section when appropriate.
- [X] **Re-enable FDL Visualizer:** Uncomment and restore the "Select Camera Setup to Visualize" dropdown and the `FDLVisualizer` component when appropriate. _(Completed - Basic refactor for layout and tech info panel done)_

## Advanced Features & Collaboration

- [ ] **Live Build & Collaboration:** Implement a "Live Build" feature allowing users to share a link with others who can view the FDL in real-time and potentially draw/annotate. Start with a simple implementation and iterate based on user feedback.
- [ ] **Max Frame Rates Information:** Add a feature to display maximum frame rates based on the selected Camera Model, Resolution, and potentially Codec. This will require additional data input and matching logic.
- [ ] **Frameleader Creation:** Develop a comprehensive "Frameleader" creation tool. Use the Arri Frameline Composer as a reference but aim to offer more creative freedom and flexibility in designing frame leaders.
- [ ] **Field of View (FoV) Calculator:** Implement a Field of View calculator. It should take the source Camera/Model/Resolution and a user-inputted lens, and allow comparison against various other camera formats (e.g., 35mm film, 65mm film, 16mm film), resolutions, and lenses, providing a visual representation of the FoV differences.
- [ ] **Stabilization Preview for Protection:** Add a visual "stabilization" preview linked to the "protection" setting for framing intents. This should be a user-adjustable slider that demonstrates how increased protection provides more room for stabilization at the cost of resolution.

## Guiding Principles

*   **Simplicity:** Always prioritize keeping the application simple and focused on making FDL creation as easy as possible.
*   **Methodical Development:** Build a solid, error-free foundation before implementing more complex features. 
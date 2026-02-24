/**
 * Inputs Module
 *
 * Manages audio input, MIDI input, and sample library functionality.
 *
 * Architecture:
 * - InputsPanel: Main panel component with tab navigation
 * - Section components: AudioInputSection, MidiInputSection, SampleLibrarySection
 * - Hooks: useAudioInput, useMidiInput, useSampleLibrary
 * - Presentation components: InputsAudioControls, InputsMidiDeviceSelector, InputsSampleLibrary
 */

export { InputsPanel } from "./InputsPanel";
export * from "./types";

/**
 * Story wrappers for DialogueBox — used by Playwright CT.
 *
 * DialogueBox reads inDialogue, dialogueName, dialogueText,
 * currentInteractable, and closeDialogue from useGameStore.
 * We set store state so the component renders without a running game.
 */
import { useEffect } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { DialogueBox } from './DialogueBox';

/**
 * Renders a dialogue with a blacksmith NPC.
 */
export function DialogueBoxBlacksmith() {
  useEffect(() => {
    useGameStore.setState({
      inDialogue: true,
      dialogueName: 'Aldric the Smith',
      dialogueText:
        'Welcome, traveler! My forge burns hot today. What brings you to this humble smithy?',
      currentInteractable: {
        id: 'npc-aldric',
        position: { x: 0, y: 0, z: 0, isVector3: true } as never,
        radius: 3,
        type: 'blacksmith',
        name: 'Aldric the Smith',
        dialogueText:
          'Welcome, traveler! My forge burns hot today. What brings you to this humble smithy?',
        actionVerb: 'Talk to',
      },
    });
  }, []);

  return <DialogueBox />;
}

/**
 * Renders a dialogue with a wanderer NPC (default type).
 */
export function DialogueBoxWanderer() {
  useEffect(() => {
    useGameStore.setState({
      inDialogue: true,
      dialogueName: 'Mysterious Stranger',
      dialogueText:
        'The road ahead is long and full of peril. Take care, friend.',
      currentInteractable: {
        id: 'npc-stranger',
        position: { x: 0, y: 0, z: 0, isVector3: true } as never,
        radius: 3,
        type: 'wanderer',
        name: 'Mysterious Stranger',
        dialogueText:
          'The road ahead is long and full of peril. Take care, friend.',
        actionVerb: 'Speak with',
      },
    });
  }, []);

  return <DialogueBox />;
}

/**
 * DialogueBox when not in dialogue — should not render.
 */
export function DialogueBoxHidden() {
  useEffect(() => {
    useGameStore.setState({
      inDialogue: false,
      dialogueName: '',
      dialogueText: '',
      currentInteractable: null,
    });
  }, []);

  return (
    <div data-testid="dialogue-hidden-wrapper">
      <DialogueBox />
    </div>
  );
}

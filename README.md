This tool is free, please feel free to give me any feedback on Github. If you find the tool useful and want to buy me a coffee to say thanks then please feel free to follow this link https://buymeacoffee.com/manwilaugh


# Anchors & Buoys

A free After Effects panel that keeps your important layers where they belong.

Mark a layer as **Buoyant** and it floats to the top of your stack and stays there. Mark it as **Anchored** and it sinks to the bottom and stays put. Everything else lives in the middle.

No more adjustment layers buried under 40 precomps, or backgrounds creeping up the stack while you work. Add new layers, shuffle things around, make a mess — your pinned layers snap back into place automatically.

Two buttons, one checkbox, done.

---

## Requirements

- After Effects CC 2021 or later (Mac or Windows)
- No plugins, no dependencies — it's a single .jsx file

---

## Installation

1. **Close After Effects** if it's open.

2. **Copy `Anchors_and_Buoys.jsx` into your ScriptUI Panels folder:**

   **Mac:**
   ```
   /Applications/Adobe After Effects [version]/Scripts/ScriptUI Panels/
   ```

   **Windows:**
   ```
   C:\Program Files\Adobe\Adobe After Effects [version]\Support Files\Scripts\ScriptUI Panels\
   ```

   Your operating system may ask for an admin password — that's normal, the folder is protected.

3. **Restart After Effects.**

4. Open the **Window** menu. `Anchors_and_Buoys.jsx` now appears in the list at the bottom, alongside AE's own panels.

5. Click it to open the panel, then **drag it by its name tab** to dock it anywhere in your workspace. It works well as a narrow strip next to your timeline. Once docked, it saves with your workspace.

> **Note:** running the script via *File > Scripts > Run Script File* also works, but it will open as a floating window that cannot be docked. For a dockable panel, it must live in the ScriptUI Panels folder.

---

## How to use it

**Pin layers to the top:**
Select one or more layers and click **Make Buoyant (To Top)**. The layers move to the top of the stack and their labels turn yellow.

**Pin layers to the bottom:**
Select one or more layers and click **Make Anchored (To Bottom)**. The layers move to the bottom of the stack and their labels turn blue.

**Everything else:**
Unmarked (neutral) layers sit in the middle. New layers you add will always appear in the middle zone, between your buoyant and anchored layers.

**Unpin layers:**
- **Clear Selected** removes the flags from just the layers you have selected.
- **Clear All** removes the flags from every layer in the comp.

Either way, the layers' original label colours are restored.

**Reordering within a group:**
Layers are only pinned to their *zone*, not to an exact position. You can freely reorder layers within the buoyant group, the neutral middle, or the anchored group.

**Auto Enforce:**
With the checkbox on (the default), the panel checks your comp twice a second and moves any marked layers back into their zone automatically. The green dot means it's active. Turn it off and layers only get sorted when you click one of the buttons.

**Good to know:**
- Flags are stored in each layer's comment field as a small tag, e.g. `[CLP:buoyant:5]`. Any existing comments on the layer are kept.
- Flags are saved with your project, so they survive closing and reopening AE.
- Everything the panel does is undoable (Ctrl/Cmd+Z).

---

## Troubleshooting: Auto Enforce

Auto Enforce works by polling the active comp every 0.5 seconds. That's what makes the "snap back" magic happen, but it has a few side effects worth knowing about.

**AE feels sluggish in big projects.**
In comps with hundreds of layers, or projects running lots of expressions, other scripts, or background renders, the twice-a-second check can add noticeable overhead. Toggle Auto Enforce **off** while doing heavy work, then flick it back on to re-sort the stack. Nothing is lost while it's off — your flags stay on the layers.

**"My layer keeps jumping back when I try to move it!"**
That's Auto Enforce doing its job a bit too enthusiastically. If you drag a *marked* layer out of its zone, it will snap back within half a second. To manually reposition a marked layer, either toggle Auto Enforce off first, or clear the layer's flag, move it, and re-flag it.

**A marked layer isn't moving into place.**
Check whether the layer is inside a different comp — the panel only manages the comp you currently have active. Also make sure the comp panel is actually active (click in it once).

**Layers snap into position but the label colours look wrong.**
Label colours are user preferences in AE (Settings > Labels). The panel uses label slots 4 and 9, which are "Yellow" and "Blue" on default settings. If you've customised your label colours, the layers will still sort correctly — they'll just wear whatever colours you've assigned to those slots.

**I closed the panel but things still seem to be sorting.**
Restart After Effects. The background task is cancelled when the panel closes, but if AE ever gets confused (it happens), a restart fully clears it.

**Undo seems odd after using the panel.**
Every enforcement action is wrapped in its own undo group named "Enforce Layer Groups". If Auto Enforce fixed the stack right after your last action, you may need to hit undo twice — once for the enforcement, once for your action.

---

## Uninstalling

Delete `Anchors_and_Buoys.jsx` from the ScriptUI Panels folder and restart AE. If you want to remove the flags from a project first, open the panel and click **Clear All** in each comp — this also restores your original label colours.

---

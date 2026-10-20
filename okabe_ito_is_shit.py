import matplotlib.pyplot as plt
import numpy as np

# Farbpaletten definieren (jeweils ohne Schwarz)
okabe_ito = ["#E69F00", "#56B4E9", "#009E73", "#F0E442", "#0072B2", "#D55E00", "#CC79A7"]
custom_palette = ["#41003F", "#00460D", "#AD183D", "#3F9BBD", "#FF8C55", "#C4C0FF", "#FCE182"]

# Diagramm erstellen
fig, axes = plt.subplots(2, 1, figsize=(10, 4.5), sharex=True)
fig.suptitle("Paletten-Vergleich (jeweils ohne Schwarz)", fontsize=14, fontweight="bold")

n_colors = len(okabe_ito)
# KORREKTUR: Werte von 0 bis 6 generieren, damit jede Spalte einen anderen Index in der Map nutzt
data = np.arange(n_colors).reshape(1, -1)

# 1. Okabe-Ito Plot
axes[0].imshow(data, cmap=plt.cm.colors.ListedColormap(okabe_ito), aspect="auto")
axes[0].set_title("Okabe-Ito Palette", fontsize=11, loc="left", pad=5)
axes[0].set_yticks([])

# Text-Labels für Hex-Codes in den Okabe-Ito Balken hinzufügen
for i, color in enumerate(okabe_ito):
    text_color = "black" if color in ["#F0E442", "#56B4E9"] else "white"
    axes[0].text(i, 0, color, ha="center", va="center", color=text_color, fontweight="bold", fontsize=9)

# 2. Custom Palette Plot
axes[1].imshow(data, cmap=plt.cm.colors.ListedColormap(custom_palette), aspect="auto")
axes[1].set_title("Deine Palette", fontsize=11, loc="left", pad=5)
axes[1].set_yticks([])

# Text-Labels für Hex-Codes in den Custom Balken hinzufügen
for i, color in enumerate(custom_palette):
    text_color = "black" if color in ["#C4C0FF", "#FCE182", "#FF8C55"] else "white"
    axes[1].text(i, 0, color, ha="center", va="center", color=text_color, fontweight="bold", fontsize=9)

# Layout optimieren und Achsenbeschriftungen anpassen
for ax in axes:
    ax.set_xticks(np.arange(n_colors))
    ax.set_xticklabels([f"Farbe {i+1}" for i in range(n_colors)])
    ax.tick_params(bottom=False, left=False)

plt.tight_layout()
plt.show()

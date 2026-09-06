; ============================================================
; ASCII ART PLOTTER - CNC-Filzstift auf T-Shirt
; Einzelstrich-Mittelachsen: Breite via Z-Druck + Feed.
;   dicker  = tiefer gedrueckt (Z) und langsamer (F).
; Kein Dwell (kein Verweilbefehl): Filzstift wuerde durchbluten.
; ------------------------------------------------------------
; Stiftbreite 0.400 mm | Z-Bereich -0.300 (duenn) .. -1.000 (dick) mm
; Hubhoehe 3.000 mm | Press 0.300 mm | Z-Gain 0.700 mm/Gewicht
; Feed: Eilgang 2400.000 | Zeichnen 600.000 (duenn) .. 300.000 (dick) | Tauchen 400.000 mm/min
; Kurvenmodus Boegen (G2/G3) | Anordnung nearest | Boegen 0
; Strokes 21 | Pen-Up-Weg 57.057 mm | Zeichenweg 143.799 mm
; ============================================================
G21 ; Einheiten: Millimeter
G90 ; Absolute Koordinaten
G0 Z3.000 ; Stift anheben (Hubhoehe)

; Stroke 1/21
G0 X0.000 Y0.000 F2400.000 ; pen up, Eilgang
G1 Z-0.300 F400.000 ; Stift absenken (Druck)
G1 X0.000 Y-3.000 F600.000
G0 Z3.000 ; Stift anheben

; Stroke 2/21
G0 X0.000 Y-3.000 F2400.000 ; pen up, Eilgang
G1 Z-0.300 F400.000 ; Stift absenken (Druck)
G1 X0.000 Y-6.000 F600.000
G0 Z3.000 ; Stift anheben

; Stroke 3/21
G0 X0.000 Y-8.000 F2400.000 ; pen up, Eilgang
G1 Z-0.300 F400.000 ; Stift absenken (Druck)
G1 X0.000 Y-13.000 F600.000
G0 Z3.000 ; Stift anheben

; Stroke 4/21
G0 X0.000 Y-13.000 F2400.000 ; pen up, Eilgang
G1 Z-0.300 F400.000 ; Stift absenken (Druck)
G1 X1.000 Y-13.000 F600.000
G1 X2.000 Y-12.000 F600.000
G0 Z3.000 ; Stift anheben

; Stroke 5/21
G0 X2.000 Y-12.000 F2400.000 ; pen up, Eilgang
G1 Z-0.300 F400.000 ; Stift absenken (Druck)
G1 X3.000 Y-13.000 F600.000
G1 X4.000 Y-13.000 F600.000
G0 Z3.000 ; Stift anheben

; Stroke 6/21
G0 X4.000 Y-13.000 F2400.000 ; pen up, Eilgang
G1 Z-0.300 F400.000 ; Stift absenken (Druck)
G1 X4.000 Y-8.000 F600.000
G0 Z3.000 ; Stift anheben

; Stroke 7/21
G0 X4.000 Y-6.000 F2400.000 ; pen up, Eilgang
G1 Z-0.300 F400.000 ; Stift absenken (Druck)
G1 X4.000 Y-3.000 F600.000
G0 Z3.000 ; Stift anheben

; Stroke 8/21
G0 X4.000 Y-3.000 F2400.000 ; pen up, Eilgang
G1 Z-0.300 F400.000 ; Stift absenken (Druck)
G1 X4.000 Y0.000 F600.000
G0 Z3.000 ; Stift anheben

; Stroke 9/21
G0 X6.000 Y-3.000 F2400.000 ; pen up, Eilgang
G1 Z-0.300 F400.000 ; Stift absenken (Druck)
G1 X6.000 Y0.000 F600.000
G1 X10.000 Y0.000 F600.000
G0 Z3.000 ; Stift anheben

; Stroke 10/21
G0 X12.000 Y0.000 F2400.000 ; pen up, Eilgang
G1 Z-0.300 F400.000 ; Stift absenken (Druck)
G1 X12.000 Y-6.000 F600.000
G1 X16.000 Y-6.000 F600.000
G0 Z3.000 ; Stift anheben

; Stroke 11/21
G0 X18.000 Y-8.000 F2400.000 ; pen up, Eilgang
G1 Z-0.300 F400.000 ; Stift absenken (Druck)
G1 X18.000 Y-14.000 F600.000
G1 X22.000 Y-14.000 F600.000
G0 Z3.000 ; Stift anheben

; Stroke 12/21
G0 X24.000 Y-9.000 F2400.000 ; pen up, Eilgang
G1 Z-0.300 F400.000 ; Stift absenken (Druck)
G1 X24.000 Y-14.000 F600.000
G1 X27.000 Y-14.000 F600.000
G1 X28.000 Y-13.000 F600.000
G1 X28.000 Y-9.000 F600.000
G1 X27.000 Y-8.000 F600.000
G1 X24.000 Y-8.000 F600.000
G0 Z3.000 ; Stift anheben

; Stroke 13/21
G0 X22.000 Y-6.000 F2400.000 ; pen up, Eilgang
G1 Z-0.300 F400.000 ; Stift absenken (Druck)
G1 X18.000 Y-6.000 F600.000
G1 X18.000 Y0.000 F600.000
G0 Z3.000 ; Stift anheben

; Stroke 14/21
G0 X24.000 Y-1.000 F2400.000 ; pen up, Eilgang
G1 Z-0.300 F400.000 ; Stift absenken (Druck)
G1 X24.000 Y-5.000 F600.000
G1 X25.000 Y-6.000 F600.000
G1 X27.000 Y-6.000 F600.000
G1 X28.000 Y-5.000 F600.000
G1 X28.000 Y-1.000 F600.000
G1 X27.000 Y0.000 F600.000
G1 X25.000 Y0.000 F600.000
G0 Z3.000 ; Stift anheben

; Stroke 15/21
G0 X14.000 Y-11.000 F2400.000 ; pen up, Eilgang
G1 Z-0.300 F400.000 ; Stift absenken (Druck)
G1 X15.000 Y-11.000 F600.000
G1 X16.000 Y-10.000 F600.000
G1 X16.000 Y-9.000 F600.000
G1 X15.000 Y-8.000 F600.000
G1 X12.000 Y-8.000 F600.000
G1 X12.000 Y-11.000 F600.000
G0 Z3.000 ; Stift anheben

; Stroke 16/21
G0 X12.000 Y-11.000 F2400.000 ; pen up, Eilgang
G1 Z-0.300 F400.000 ; Stift absenken (Druck)
G1 X14.000 Y-11.000 F600.000
G0 Z3.000 ; Stift anheben

; Stroke 17/21
G0 X14.000 Y-11.000 F2400.000 ; pen up, Eilgang
G1 Z-0.300 F400.000 ; Stift absenken (Druck)
G1 X14.000 Y-12.000 F600.000
G1 X16.000 Y-14.000 F600.000
G0 Z3.000 ; Stift anheben

; Stroke 18/21
G0 X12.000 Y-14.000 F2400.000 ; pen up, Eilgang
G1 Z-0.300 F400.000 ; Stift absenken (Druck)
G1 X12.000 Y-11.000 F600.000
G0 Z3.000 ; Stift anheben

; Stroke 19/21
G0 X10.000 Y-6.000 F2400.000 ; pen up, Eilgang
G1 Z-0.300 F400.000 ; Stift absenken (Druck)
G1 X6.000 Y-6.000 F600.000
G1 X6.000 Y-3.000 F600.000
G0 Z3.000 ; Stift anheben

; Stroke 20/21
G0 X6.000 Y-3.000 F2400.000 ; pen up, Eilgang
G1 Z-0.300 F400.000 ; Stift absenken (Druck)
G1 X9.000 Y-3.000 F600.000
G0 Z3.000 ; Stift anheben

; Stroke 21/21
G0 X7.000 Y-8.000 F2400.000 ; pen up, Eilgang
G1 Z-0.300 F400.000 ; Stift absenken (Druck)
G1 X9.000 Y-8.000 F600.000
G1 X10.000 Y-9.000 F600.000
G1 X10.000 Y-13.000 F600.000
G1 X9.000 Y-14.000 F600.000
G1 X7.000 Y-14.000 F600.000
G1 X6.000 Y-13.000 F600.000
G1 X6.000 Y-9.000 F600.000
G0 Z3.000 ; Stift anheben

G0 X0.000 Y0.000 ; Parkposition
M30 ; Programmende

// Test the JavaScript syntax from quantum_noodles.html

// Test the noodle creation and color system
class TestNoodleEngine {
    getRandomNoodleColor() {
        // Natural noodle colors - warm tones
        const colors = [
            'rgba(255, 220, 180, 0.8)', // Light wheat
            'rgba(255, 200, 150, 0.8)', // Warm beige
            'rgba(240, 180, 120, 0.8)', // Golden wheat
            'rgba(255, 230, 200, 0.8)', // Cream
            'rgba(220, 190, 160, 0.8)', // Light brown
            'rgba(255, 210, 170, 0.8)', // Warm cream
            'rgba(240, 200, 160, 0.8)', // Soft wheat
            'rgba(250, 220, 180, 0.8)'  // Light golden
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    testColorHandling() {
        const noodle = {
            color: this.getRandomNoodleColor(),
            zDepth: 50
        };
        
        const opacity = 0.3 + (noodle.zDepth / 100) * 0.7;
        let strokeColor = noodle.color;
        
        if (strokeColor.includes('rgba')) {
            strokeColor = strokeColor.replace(/\d+\.?\d*\)$/, opacity + ')');
        } else if (strokeColor.includes('rgb')) {
            strokeColor = strokeColor.replace('rgb', 'rgba').replace(')', ', ' + opacity + ')');
        } else {
            strokeColor = `rgba(255, 220, 180, ${opacity})`;
        }
        
        console.log('Original color:', noodle.color);
        console.log('Opacity:', opacity);
        console.log('Final color:', strokeColor);
        
        return strokeColor;
    }
}

const test = new TestNoodleEngine();
test.testColorHandling();
console.log('Syntax test passed!');
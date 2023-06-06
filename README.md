# Sudoku
数独解题器

> It's a Sudoku solver implemented using backtracking algorithms

### How to use?
```html
<script src="./Sudoku.js"></script>
```
点击单元格预出题，出题完毕后调用解题方法即可解题

### Example
```html

<div id="app"></div>
<div class="btn">
    <button onclick="solve()">解题</button>
    <button onclick="reset()">重置</button>
    <button onclick="clean()">清空</button>
</div>

<script src="./Sudoku.js"></script>
<script>

    // 构造解题器
    // 点击单元格预出题
    const sudoku = new Sudoku("#app",{
        checkOblique:false, //是否验证对角不重复
        checkBox:true,      //是否验证宫内不重复
        message:(data) =>{
            console.log(data);  //信息回调
        }
    })

    const solve = sudoku.solve  //解题
    const reset = sudoku.reset  //清空答案重置
    const clean = sudoku.clean  //清空所有

</script>

```

### Options
|    Property    |    Description   |   type   |	default	|
| -----------------  | ---------------- | :--------: | :----------: |
| checkOblique       | Enable diagonal non repeating verification |Boolean| false |
| checkBox           | Enable intrauterine non repeated verification |Boolean | true |
| message  | Message callback | Function | — |

### Functions
| Function Name | Description   |
| --------   | -----  |
|    solve    |  Start automatic problem-solving  |
|    reset    |  Clear answer reset  |
|    clean   |  Clear All |


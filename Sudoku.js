class Sudoku {
    #time = new Date().getTime()
    #dom = null
    #options = {
        checkOblique:false,
        checkBox:true,
        message:(data) =>{
            console.log(data);
        }
    }
    #list = Array.from({length:9}).map(() =>{
        return Array.from({length:9}).map(() => -1)
    })
    #proxyList = Array.from({length:9}).map(() =>{
        return Array.from({length:9}).map(() => null)
    })
    #question = []
    #active = null  //目前输入的焦点
    #status = true //输入的题目状态
    #track = [] //解题路径
    #model = "normal" //模式 normal正常、solving自动解题、finished结束并禁用
    
    // 初始化
    constructor(domStr,options = {}){
        this.#options = {
            ...this.#options,
            ...options
        }
        if(!domStr){
            this.#options.message({
                type:"error",
                code:1,
                msg:"请选择挂载的节点"
            })
            return
        }
        this.#dom = document.querySelector(domStr)
        this.#initRender()
    }
    // 创建dom方法
    #createElement = (tagName,classList,style) =>{
        const dom = document.createElement(tagName)
        dom.classList.add(...classList)
        for (const key in style) {
            if (Object.hasOwnProperty.call(style, key)) {
                dom.style[key] = style[key]
            }
        }
        return dom
    }
    // 修改指定单元格内容
    #changeNumber = (domTarget,value) =>{
        let dom = null
        if(domTarget instanceof Array){
            dom = document.querySelector(".Sudoku-grid-container-" + this.#time)
            .querySelectorAll(".Sudoku-grid-box-" + this.#time)[domTarget[0]]
            .querySelectorAll(".Sudoku-grid-item-" + this.#time)[domTarget[1]]
        }else{
            dom = domTarget
        }
        dom.childNodes.forEach(item =>{
            dom.removeChild(item)
        })
        if(this.#model == "solving"){
            dom.style.color = "#F56C6C"
        }else{
            dom.style.color = "#333"
        }
        dom.appendChild(document.createTextNode(value == -1 ? "" : value))
    }
    // 数组位置转dom位置
    #arrayToDom = (x,y) =>{
        const _x = parseInt(x / 3) * 3  + parseInt(y / 3)
        const _y = (x % 3) * 3 + y % 3
        return [_x,_y]
    }
    // 合并单元格范围
    #mergeRange = (range) =>{
        return Array.from({length:9}).map((_,index) =>index + 1).filter(item =>{
            let count = 0
            Object.values(range).forEach(value =>{
                count += value.has(item) ? 1 : 0
            })
            return count >= 5
        })
    }
    // 定值后周围单位的变化
    #inputNumber = (listPos,oldValue,newValue) =>{
        // 旧值是否正常
        const useOldValue = oldValue >= 1&&oldValue <= 9
        // 死局标识
        let resultFinally = false
        // 横向变化
        this.#proxyList[listPos[0]].forEach(item =>{
            if(useOldValue){
                item.range.x.add(oldValue)
            }
            item.range.x.delete(newValue)
            item.merge = this.#mergeRange(item.range)
            if(item.merge.length <= 0&&item.value == -1){
                resultFinally = true
            }
        })
        // 纵向变化
        Array.from({length:9}).forEach((_,index) =>{
            if(useOldValue){
                this.#proxyList[index][listPos[1]].range.y.add(oldValue)
            }
            this.#proxyList[index][listPos[1]].range.y.delete(newValue)
            this.#proxyList[index][listPos[1]].merge = this.#mergeRange(this.#proxyList[index][listPos[1]].range)
            if(this.#proxyList[index][listPos[1]].merge.length <= 0&&this.#proxyList[index][listPos[1]].value == -1){
                resultFinally = true
            }
        })
        // 斜向变化
        if(this.#options.checkOblique === true&&listPos[0] == listPos[1]){
            Array.from({length:9}).forEach((_,index) => {
                if(useOldValue){
                    this.#proxyList[index][index].range.xy1.add(oldValue)
                }
                this.#proxyList[index][index].range.xy1.delete(newValue)
                this.#proxyList[index][index].merge = this.#mergeRange(this.#proxyList[index][index].range)
                if(this.#proxyList[index][index].length <= 0&&this.#proxyList[index][index].value == -1){
                    resultFinally = true
                }
            })
        }
        if(this.#options.checkOblique === true&&listPos[0] == 8 - listPos[1]){
            Array.from({length:9}).forEach((_,index) => {
                if(useOldValue){
                    this.#proxyList[index][8-index].range.xy2.add(oldValue)
                }
                this.#proxyList[index][8-index].range.xy2.delete(newValue)
                this.#proxyList[index][8-index].merge = this.#mergeRange(this.#proxyList[index][8-index].range)
                if(this.#proxyList[index][8-index].merge.length <= 0&&this.#proxyList[index][8-index].value == -1){
                    resultFinally = true
                }
            })
        }
        // 盒子变化
        if(this.#options.checkBox === true){
            Array.from({length:9}).map((_,index) => {
                let item = this.#proxyList[parseInt(listPos[0] / 3) * 3 + parseInt(index / 3)][parseInt(listPos[1] / 3) * 3 + index % 3]
                if(useOldValue){
                    item.range.box.add(oldValue)
                }
                item.range.box.delete(newValue)
                item.merge = this.#mergeRange(item.range)
                if(item.merge.length <= 0&&item.value == -1){
                    resultFinally = true
                }
            })
        }
        return resultFinally
    }
    // 初始化渲染
    #initRender = () =>{
        let side = Math.min(this.#dom.clientWidth,this.#dom.clientHeight)
        // 渲染dom
        this.#dom.innerHtml = ""
        this.#dom.childNodes.forEach(item =>{
            this.#dom.removeChild(item)
        })
        const container = this.#createElement("div",["Sudoku-grid-container-" + this.#time],{
            display: "grid",
            width: side + "px",
            gridTemplateColumns: "calc(100% / 3) calc(100% / 3) calc(100% / 3)"
        })

        // 重组数组渲染，加代理
        this.#list.forEach((__,index) =>{
            const box = this.#createElement("div",["Sudoku-grid-box-" + this.#time],{
                backgroundColor: "rgba(0, 0, 0, 0.03)",
                border: `${this.#options.checkBox === true ? 2 : 1}px solid rgba(0, 0, 0, 0.4)`,
                height: side / 3 + "px",
                display: "grid",
                gridTemplateColumns: "calc(100% / 3) calc(100% / 3) calc(100% / 3)"
            })
            __.forEach((ele,i) =>{
                const item = this.#createElement("div",["Sudoku-grid-item-" + this.#time],{
                    textAlign: "center",
                    border: "1px solid rgba(0, 0, 0, 0.4)",
                    fontSize: side / 20 + "px",
                    lineHeight: side / 9 - 1 + "px",
                    height: side / 9 - 1 + "px",
                    cursor: "pointer",
                    color: "#333"
                })
                let content = this.#list[parseInt(index / 3) * 3  + parseInt(i / 3)][(index % 3) * 3 + i % 3]
                item.appendChild(document.createTextNode(""))
                // 标记位置
                item.setAttribute("data-dom",[index,i].join(","))
                item.setAttribute("data-list",[parseInt(index / 3) * 3  + parseInt(i / 3),(index % 3) * 3 + i % 3].join(","))
                // 添加监听事件
                item.addEventListener("mouseover",() =>{
                    if(!item.classList.contains("warning")){
                        item.style.backgroundColor = "rgba(0, 0, 0, 0.1)"
                    }
                })
                item.addEventListener("mouseout",() =>{
                    if(!item.classList.contains("warning")){
                        item.style.backgroundColor = "rgba(0, 0, 0, 0)"
                    }
                })
                item.addEventListener("click",() =>{
                    if(this.#model == "finished")return
                    if(this.#active){
                        // 还原上个容器的旧值
                        this.#proxyList[this.#active[0][0]][this.#active[0][1]].value = this.#active[1]
                    }
                    const listPosition = item.getAttribute("data-list").split(",")
                    this.#active = [listPosition,this.#proxyList[listPosition[0]][listPosition[1]].value]
                    this.#changeNumber(this.#proxyList[listPosition[0]][listPosition[1]].dom,"?")
                })
                box.appendChild(item)

                // 创建代理
                const _this = this
                this.#proxyList[index][i] = new Proxy({
                    value:ele,
                    dom:[parseInt(index / 3) * 3  + parseInt(i / 3),(index % 3) * 3 + i % 3],
                    list:[index,i],
                    warnings:[],
                    range:{
                        x:new Set(Array.from({length:9}).map((_,index) => index + 1)),
                        y:new Set(Array.from({length:9}).map((_,index) => index + 1)),
                        xy1:new Set(Array.from({length:9}).map((_,index) => index + 1)),
                        xy2:new Set(Array.from({length:9}).map((_,index) => index + 1)),
                        box:new Set(Array.from({length:9}).map((_,index) => index + 1))
                    },
                    merge:Array.from({length:9}).map((_,index) => index + 1)
                },{
                    set(target,prop,value){
                        switch (prop) {
                            case "value":
                                _this.#list[target.list[0]][target.list[1]] = value
                                _this.#changeNumber(target.dom,value)
                                break;
                            case "warnings":
                                if(value.length > 0){
                                    const dom = document.querySelector(".Sudoku-grid-container-" + _this.#time)
                                    .querySelectorAll(".Sudoku-grid-box-" + _this.#time)[target.dom[0]]
                                    .querySelectorAll(".Sudoku-grid-item-" + _this.#time)[target.dom[1]]
                                    dom.style["backgroundColor"] = "rgba(245, 108, 108,0.25)"
                                    dom.classList.add("warning")
                                }else{
                                    const dom = document.querySelector(".Sudoku-grid-container-" + _this.#time)
                                    .querySelectorAll(".Sudoku-grid-box-" + _this.#time)[target.dom[0]]
                                    .querySelectorAll(".Sudoku-grid-item-" + _this.#time)[target.dom[1]]
                                    dom.style["backgroundColor"] = "rgba(0, 0, 0, 0)"
                                    dom.classList.remove("warning")
                                }
                                break;
                            default:
                                break;
                        }
                        target[prop] = value
                        return Reflect.set(target,prop,value)
                    },
                    get(target,prop){
                        return target[prop]
                    }
                })
            })
            container.appendChild(box)
        })

        this.#dom.appendChild(container)
        
        // 监听键盘事件
        document.addEventListener("keydown",(e) =>{
            if(this.#active){
                if((e.keyCode >= 48&&e.keyCode <= 57) || (e.keyCode >= 96&&e.keyCode <= 105) || e.keyCode == 46){
                    // delete键删除值
                    let value = e.keyCode == 46 ? -1 : parseInt(e.key)
                    // 对周围单位产生影响,是否死局
                    const resultFinally = this.#inputNumber(this.#proxyList[this.#active[0][0]][this.#active[0][1]].list,this.#proxyList[this.#active[0][0]][this.#active[0][1]].value,value)
                    // 更新数据和视图
                    this.#proxyList[this.#active[0][0]][this.#active[0][1]].value = value
                    // 检测是否合法
                    this.#status = this.checkSudokuItem(this.#active[0],value)&&!resultFinally
                    // 清空
                    this.#active = null
                    if(resultFinally === true){
                        this.#options.message({
                            type:"error",
                            code:1,
                            msg:"该局无解"
                        })
                        return
                    }
                }else{
                    this.#options.message({
                        type:"error",
                        code:1,
                        msg:"请输入正确的数字"
                    })
                    return
                }
            }
        })

        // 监听栅格外的点击事件
        document.addEventListener("click",(e) =>{
            if(!this.#dom.contains(e.target)){
                if(this.#active){
                    this.#proxyList[this.#active[0][0]][this.#active[0][1]].value = this.#active[1]
                    this.#active = null
                }
            }
        })
    }
    // 校验规则，抛出错误
    checkSudokuItem = (listPos,value) =>{
        if(!(value >= 1&&value <= 9)){
            return true
        }
        const updateData = (dataArray,warningType,msg) =>{
            // 获取warning的每个目标
            const getTarget = (index) =>{
                let target = null
                switch (warningType) {
                    case "warning-x":
                        target = this.#proxyList[listPos[0]][index]
                        break;
                    case "warning-y":
                        target = this.#proxyList[index][listPos[1]]
                        break;
                    case "warning-xy-1":
                        target = this.#proxyList[index][index]
                        break;
                    case "warning-xy-2":
                        target = this.#proxyList[index][8-index]
                        break;
                    case "warning-box":
                        target = this.#proxyList[parseInt(listPos[0] / 3) * 3 + parseInt(index / 3)][parseInt(listPos[1] / 3) * 3 + index % 3]
                    default:
                        break;
                }
                return target
            }
            const result = dataArray.length != [...new Set(dataArray)].length
            if(result){
                // 未通过校验
                Array.from({length:9}).forEach((_,index) =>{
                    const target = getTarget(index)
                    const warningSet = new Set(target.warnings)
                    warningSet.add(warningType)
                    target.warnings = [...warningSet]
                })
                this.#options.message({
                    type:"error",
                    code:1,
                    msg
                })
            }else{
                // 通过校验
                Array.from({length:9}).forEach((_,index) =>{
                    const target = getTarget(index)
                    const warningSet = new Set(target.warnings)
                    warningSet.has(warningType)&&warningSet.delete(warningType)
                    target.warnings = [...warningSet]
                })
            }
            return !result
        }
        const resultArray = []
        // 横向校验
        const xArray = this.#list[listPos[0]].filter(item =>item != -1)
        resultArray.push(updateData(xArray,"warning-x","横向数字不能重复"))
        // 纵向校验
        const yArray = Array.from({length:9}).map((_,index) => this.#list[index][listPos[1]]).filter(item =>item != -1)
        resultArray.push(updateData(yArray,"warning-y","纵向数字不能重复"))
        // 斜向校验
        if(this.#options.checkOblique === true&&listPos[0] == listPos[1]){
            const xyArray1 = Array.from({length:9}).map((_,index) => this.#list[index][index]).filter(item =>item != -1)
            resultArray.push(updateData(xyArray1,"warning-xy-1","斜向数字不能重复"))
        }
        if(this.#options.checkOblique === true&&listPos[0] == 8 - listPos[1]){
            const xyArray2 = Array.from({length:9}).map((_,index) => this.#list[index][8-index]).filter(item =>item != -1)
            resultArray.push(updateData(xyArray2,"warning-xy-2","斜向数字不能重复"))
        }
        // 盒子校验
        if(this.#options.checkBox === true){
            const boxArray = Array.from({length:9}).map((_,index) => this.#list[parseInt(listPos[0] / 3) * 3 + parseInt(index / 3)][parseInt(listPos[1] / 3) * 3 + index % 3]).filter(item =>item != -1)
            resultArray.push(updateData(boxArray,"warning-box","盒子内数字不能重复"))
        }
        return resultArray.every(item => item)
    }
    // 解题
    solve = () =>{
        if(!this.#status){
            this.#options.message({
                type:"error",
                code:1,
                msg:"题目错误"
            })
            return
        }
        // 解除输入状态
        if(this.#active){
            this.#proxyList[this.#active[0][0]][this.#active[0][1]].value = this.#active[1]
            this.#active = null
        }
        // 存储当前题目
        this.#question = []
        this.#list.forEach(item =>{
            let arr = []
            item.forEach(ele =>{
                arr.push(ele)
            })
            this.#question.push(arr)
        })

        this.#model = "solving"
        this.#orient()
    }
    // 定位最优解题单元
    #orient = () =>{
        while (this.#track.length < 9 * 9) {
            let arr = this.#proxyList.flat(2).filter(item => item.value == -1)
            if(arr.length <= 0){
                this.#options.message({
                    type:"success",
                    code:0,
                    msg:"解题完成"
                })
                this.#model = "finished"
                return
            }
            let min = Math.min(...arr.map(item =>item.merge.length))
            let proxy = arr.find(item => item.merge.length == min)
            this.#changeBox(proxy,0)
        }
    }
    // 修改单元值
    #changeBox = (proxy,index) =>{
        // 回退方法
        const back = () =>{
            this.#track.splice(this.#track.length - 1,1)
            if(this.#track.length <= 0){
                this.#options.message({
                    type:"error",
                    code:1,
                    msg:"该局无解"
                })
                this.#model = "normal"
            }
            let dot = this.#track[this.#track.length - 1]
            this.#inputNumber(this.#proxyList[dot.list[0]][dot.list[1]].list,this.#proxyList[dot.list[0]][dot.list[1]].value,-1)
            this.#proxyList[dot.list[0]][dot.list[1]].value = -1
            this.#changeBox(this.#proxyList[dot.list[0]][dot.list[1]],dot.index + 1)
        }
        if(!proxy.merge[index]){
            back()
            return
        }
        // 更新数据和视图
        this.#proxyList[proxy.list[0]][proxy.list[1]].value = proxy.merge[index]
        // 改变周围单位取值范围
        const resultFinally = this.#inputNumber(proxy.list,proxy.value,proxy.merge[index])
        // 记录路径
        if(index == 0){
            this.#track.push({
                list:proxy.list,
                index
            })
        }else{
            this.#track[this.#track.length - 1].index = index
        }
        if(resultFinally === true){
            if(proxy.merge[index + 1]&&proxy.merge[index + 1] <= 9){
                this.#changeBox(proxy,index + 1)
            }else{
                this.#inputNumber(this.#proxyList[proxy.list[0]][proxy.list[1]].list,this.#proxyList[proxy.list[0]][proxy.list[1]].value,-1)
                this.#proxyList[proxy.list[0]][proxy.list[1]].value = -1
                back()
            }
        }
    }
    // 导入
    importQuestion = (question) =>{
        // 解除输入态
        if(this.#active){
            this.#proxyList[this.#active[0][0]][this.#active[0][1]].value = this.#active[1]
            this.#active = null
        }
        question.forEach((item,index) =>{
            item.forEach((ele,i) =>{
                if(ele >= 1&&ele <=9){
                    // 对周围单位产生影响,是否死局
                    const resultFinally = this.#inputNumber(this.#proxyList[index][i].list,this.#proxyList[index][i].value,ele)
                    // 更新数据和视图
                    this.#proxyList[index][i].value = ele
                    // 检测是否合法
                    this.#status = this.checkSudokuItem([index,i],ele)&&!resultFinally
                }else{
                    // 更新数据和视图
                    this.#proxyList[index][i].value = -1
                }
            })
        })
    }
    // 清空
    clean = () =>{
        this.#list = Array.from({length:9}).map(() =>{
            return Array.from({length:9}).map(() => -1)
        })
        this.#proxyList = Array.from({length:9}).map(() =>{
            return Array.from({length:9}).map(() => null)
        })
        this.#time = new Date().getTime()
        this.#model = "normal"
        this.#track = []
        this.#status = true
        this.#question = []
        this.#initRender()
    }
    // 重置题目
    reset = () =>{
        this.#list = Array.from({length:9}).map(() =>{
            return Array.from({length:9}).map(() => -1)
        })
        this.#proxyList = Array.from({length:9}).map(() =>{
            return Array.from({length:9}).map(() => null)
        })
        this.#time = new Date().getTime()
        this.#model = "normal"
        this.#track = []
        this.#status = true
        this.#initRender()
        this.importQuestion(this.#question)
    }
}
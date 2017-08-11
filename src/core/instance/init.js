/* @flow */

import config from '../config'
import { initProxy } from './proxy'
import { initState } from './state'
import { initRender } from './render'
import { initEvents } from './events'
import { mark, measure } from '../util/perf'
import { initLifecycle, callHook } from './lifecycle'
import { initProvide, initInjections } from './inject'
import { extend, mergeOptions, formatComponentName } from '../util/index'

let uid = 0  //设置vue类的对应id

//mixin(混合)方式初始化 传入一个对象(Vue)父类为Component
export function initMixin (Vue: Class<Component>) { //导出初始化方法
  //为Vue添加_init方法  传入一个option对象
  Vue.prototype._init = function (options?: Object) {   
    //获得vue对象实例
    const vm: Component = this
    // a uid
    vm._uid = uid++
    //开始标签 结束标签
    let startTag, endTag
    //在生产环境下 如果设置了需要打印初始化事件的时间则执行
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      //设置开始标志
      startTag = `vue-perf-init:${vm._uid}`
      //设置结束标志
      endTag = `vue-perf-end:${vm._uid}`
      //控制台打印开始标志  vue-perf-init: + _uid
      mark(startTag)
    } 

    //为vue对象添加一个vue表示表明他是vue实例以此避免被监听
    vm._isVue = true
    //合并选项 如果在option中确定了实例有内部组件则需要对其做特别的优化
    if (options && options._isComponent) {
        /* 
        * 优化内部组件的初始化,因为动态选择合并效率非常低
        *所以如果有需要这样做则要特别的优化
        */
        //需要特殊优化的情况 (手动初始化)
      initInternalComponent(vm, options)
      //自动初始化
    } else {
      vm.$options = mergeOptions(
        resolveConstructorOptions(vm.constructor),
        options || {},
        vm
      )
    }
    /* istanbul ignore else */
    if (process.env.NODE_ENV !== 'production') {
      initProxy(vm)
    } else {
      vm._renderProxy = vm
    }
    // expose real self
    vm._self = vm
    initLifecycle(vm)
    initEvents(vm)
    initRender(vm)
    callHook(vm, 'beforeCreate')
    initInjections(vm) // resolve injections before data/props
    initState(vm)
    initProvide(vm) // resolve provide after data/props
    callHook(vm, 'created')

    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      vm._name = formatComponentName(vm, false)
      mark(endTag)
      measure(`${vm._name} init`, startTag, endTag)
    }

    if (vm.$options.el) {
      vm.$mount(vm.$options.el)
    }
  }
}
//初始化内部组件 传入vue实例及option
function initInternalComponent (vm: Component, options: InternalComponentOptions) {
  //创建一个vue对象的option对象,并赋值给传入的vue实例,再引用给一个常量
  const opts = vm.$options = Object.create(vm.constructor.options)
  //手动给vue实例添加初始化的option
  opts.parent = options.parent
  opts.propsData = options.propsData
  opts._parentVnode = options._parentVnode
  opts._parentListeners = options._parentListeners
  opts._renderChildren = options._renderChildren
  opts._componentTag = options._componentTag
  opts._parentElm = options._parentElm
  opts._refElm = options._refElm
  if (options.render) {
    opts.render = options.render
    opts.staticRenderFns = options.staticRenderFns
  }
}

export function resolveConstructorOptions (Ctor: Class<Component>) {
  let options = Ctor.options
  if (Ctor.super) {
    const superOptions = resolveConstructorOptions(Ctor.super)
    const cachedSuperOptions = Ctor.superOptions
    if (superOptions !== cachedSuperOptions) {
      // super option changed,
      // need to resolve new options.
      Ctor.superOptions = superOptions
      // check if there are any late-modified/attached options (#4976)
      const modifiedOptions = resolveModifiedOptions(Ctor)
      // update base extend options
      if (modifiedOptions) {
        extend(Ctor.extendOptions, modifiedOptions)
      }
      options = Ctor.options = mergeOptions(superOptions, Ctor.extendOptions)
      if (options.name) {
        options.components[options.name] = Ctor
      }
    }
  }
  return options
}

function resolveModifiedOptions (Ctor: Class<Component>): ?Object {
  let modified
  const latest = Ctor.options
  const extended = Ctor.extendOptions
  const sealed = Ctor.sealedOptions
  for (const key in latest) {
    if (latest[key] !== sealed[key]) {
      if (!modified) modified = {}
      modified[key] = dedupe(latest[key], extended[key], sealed[key])
    }
  }
  return modified
}

function dedupe (latest, extended, sealed) {
  // compare latest and sealed to ensure lifecycle hooks won't be duplicated
  // between merges
  if (Array.isArray(latest)) {
    const res = []
    sealed = Array.isArray(sealed) ? sealed : [sealed]
    extended = Array.isArray(extended) ? extended : [extended]
    for (let i = 0; i < latest.length; i++) {
      // push original options and not sealed options to exclude duplicated options
      if (extended.indexOf(latest[i]) >= 0 || sealed.indexOf(latest[i]) < 0) {
        res.push(latest[i])
      }
    }
    return res
  } else {
    return latest
  }
}

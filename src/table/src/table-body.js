import { getCell, getColumnByCell, getRowIdentity, mergeData } from './util';
import { hasClass, addClass, removeClass } from 'element-ui/src/utils/dom';
// import ElCheckbox from 'element-ui/packages/checkbox';
// import ElTooltip from 'element-ui/packages/tooltip';
import debounce from 'throttle-debounce/debounce';

function renderTableRow(row, $index, columnsHidden, h) {
  return <tr
    style={this.rowStyle ? this.getRowStyle(row, $index) : null}
    key={this.table.rowKey ? this.getKeyOfRow(row, $index) : $index}
    on-dblclick={($event) => this.handleDoubleClick($event, row)}
    on-click={($event) => this.handleClick($event, row)}
    on-contextmenu={($event) => this.handleContextMenu($event, row)}
    on-mouseenter={_ => this.handleMouseEnter($index)}
    on-mouseleave={_ => this.handleMouseLeave()}
    class={[this.getRowClass(row, $index)]}>
    {
      this._l(this.columns, (column, cellIndex) =>
        <td
          class={[column.id, column.align, column.className || '', columnsHidden[cellIndex] ? 'is-hidden' : '']}
          on-mouseenter={($event) => this.handleCellMouseEnter($event, row)}
          on-mouseleave={this.handleCellMouseLeave}>
          {
            column.renderCell.call(this._renderProxy, h, {
              row,
              column,
              $index,
              store: this.store,
              _self: this.context || this.table.$vnode.context
            }, columnsHidden[cellIndex])
          }
        </td>
      )
    }
    {
      !this.fixed && this.layout.scrollY && this.layout.gutterWidth ? <td class="gutter"/> : ''
    }
  </tr>;
}


export default {
  components: {
    // ElCheckbox,
    // ElTooltip
  },

  props: {
    store: {
      required: true
    },
    stripe: Boolean,
    context: {},
    layout: {
      required: true
    },
    rowClassName: [String, Function],
    rowStyle: [Object, Function],
    fixed: String,
    highlight: Boolean,
    mergeCells: Boolean, //合并单元格
    mergeId: String, // 用来识别合并分组
  },

  render(h) {
    const columnsHidden = this.columns.map((column, index) => this.isColumnHidden(index));
    let allCount = -1; // 用来记录原数据的行数
    return (
      <table
        class="el-table__body"
        cellspacing="0"
        cellpadding="0"
        border="0">
        <colgroup>
          {
            this._l(this.columns, column =>
              <col
                name={ column.id }
                width={ column.realWidth || column.width }
              />)
          }
        </colgroup>
        <tbody>
          {
            this._l(this.data, (row, $index) => {
              const fieldLength = Object.keys(row).length;
              let fieldIndex = new Array(fieldLength);
              var accumulator = new Array(fieldLength);
              fieldIndex.fill(0);
              accumulator.fill(0);
              let count = 1;
              return [
                this._l(this.rowCount($index), lineNo => {
                  allCount ++;
                  return <tr
                  style={ this.rowStyle ? this.getRowStyle(row, $index) : null }
                  key={ this.table.rowKey ? this.getKeyOfRow(row, $index) : $index }
                  on-dblclick={ ($event) => this.handleDoubleClick($event, row) }
                  on-click={ ($event) => this.handleClick($event, row) }
                  on-contextmenu={ ($event) => this.handleContextMenu($event, row) }
                  on-mouseenter={ _ => this.handleMouseEnter($index) }
                  on-mouseleave={ _ => this.handleMouseLeave() }
                  class={ [this.getRowClass(row, $index)] }>
                  {
                    this._l(this.columns, (column, cellIndex) => {
                      let value;
                      if(this.mergeCells && column.property) {
                        accumulator[cellIndex]++;
                        const fields = row[column.property]; // 获取该列所有数据
                        const field = fields[fieldIndex[cellIndex]] || {count: 1, value: undefined};
                        count = field.count;
                        value = field.value;
                        if(accumulator[cellIndex] === count) {
                          accumulator[cellIndex] = 0;
                          fieldIndex[cellIndex] ++;
                        }
                      }
                      return  accumulator[cellIndex] === 1 || (count === 1)? <td
                        class={ [column.id, column.align, column.className || '', columnsHidden[cellIndex] ? 'is-hidden' : ''] }
                        on-mouseenter={ ($event) => this.handleCellMouseEnter($event, row) }
                        on-mouseleave={ this.handleCellMouseLeave }
                        rowspan={this.mergeCells ? count : 1}
                      >
                        {
                          column.renderCell.call(this._renderProxy, h, {
                            row: this.store.states.data[allCount],
                            column,
                            $index,
                            mergeValue: value,
                            store: this.store,
                            _self: this.context || this.table.$vnode.context
                          }, columnsHidden[cellIndex])
                        }
                      </td> : null
                    })
                  }
                  {
                    !this.fixed && this.layout.scrollY && this.layout.gutterWidth ? <td class="gutter"/> : ''
                  }
                </tr>}),
                this.store.states.expandRows.indexOf(row) > -1
                  ? (<tr>
                  <td colspan={ this.columns.length } class="el-table__expanded-cell">
                    { this.table.renderExpanded ? this.table.renderExpanded(h, {row, $index, store: this.store}) : ''}
                  </td>
                </tr>)
                  : ''
              ]
            }).concat(
              this._self.$parent.$slots.append
            ).concat(
              <el-tooltip effect={ this.table.tooltipEffect } placement="top" ref="tooltip" content={ this.tooltipContent }></el-tooltip>
            )
          }
        </tbody>
      </table>
    );
  },

  watch: {
    'store.states.hoverRow'(newVal, oldVal) {
      if (!this.store.states.isComplex) return;
      const el = this.$el;
      if (!el) return;
      const rows = el.querySelectorAll('tbody > tr.el-table__row');
      const oldRow = rows[oldVal];
      const newRow = rows[newVal];
      if (oldRow) {
        removeClass(oldRow, 'hover-row');
      }
      if (newRow) {
        addClass(newRow, 'hover-row');
      }
    },
    'store.states.currentRow'(newVal, oldVal) {
      if (!this.highlight) return;
      const el = this.$el;
      if (!el) return;
      const data = this.store.states.data;
      const rows = el.querySelectorAll('tbody > tr.el-table__row');
      const oldRow = rows[data.indexOf(oldVal)];
      const newRow = rows[data.indexOf(newVal)];
      if (oldRow) {
        removeClass(oldRow, 'current-row');
      } else if (rows) {
        [].forEach.call(rows, row => removeClass(row, 'current-row'));
      }
      if (newRow) {
        addClass(newRow, 'current-row');
      }
    }
  },

  computed: {
    table() {
      return this.$parent;
    },

    mergeRules() {
      const rules = {};
      this.columns.forEach(column => {
        if(column.relativeProp) {
          rules[column.property] = column.relativeProp;
        }
      });

      return rules;
    },

    data() {
      if(this.mergeCells) {
        return mergeData(this.store.states.data, {
          uniqKey: this.mergeId,
          rules: this.mergeRules
        });
      }
      return this.store.states.data;
    },

    columnsCount() {
      return this.store.states.columns.length;
    },

    leftFixedCount() {
      return this.store.states.fixedColumns.length;
    },

    rightFixedCount() {
      return this.store.states.rightFixedColumns.length;
    },

    columns() {
      return this.store.states.columns;
    }
  },

  data() {
    return {
      tooltipContent: '',
    };
  },

  created() {
    this.activateTooltip = debounce(50, tooltip => tooltip.handleShowPopper());
  },

  methods: {

    rowCount(index) {
      if(this.mergeCells) {
        if(!this.data.length) {
          return 0;
        }else {
          return Object.values(this.data[index])[0].reduce((accumulator, curr) => accumulator + curr.count, 0);
        }
      }
      return 1;
    },

    getKeyOfRow(row, index) {
      const rowKey = this.table.rowKey;
      if (rowKey) {
        return getRowIdentity(row, rowKey);
      }
      return index;
    },

    isColumnHidden(index) {
      if (this.fixed === true || this.fixed === 'left') {
        return index >= this.leftFixedCount;
      } else if (this.fixed === 'right') {
        return index < this.columnsCount - this.rightFixedCount;
      } else {
        return (index < this.leftFixedCount) || (index >= this.columnsCount - this.rightFixedCount);
      }
    },

    getRowStyle(row, index) {
      const rowStyle = this.rowStyle;
      if (typeof rowStyle === 'function') {
        return rowStyle.call(null, row, index);
      }
      return rowStyle;
    },

    getRowClass(row, index) {
      const classes = ['el-table__row'];

      if (this.stripe && index % 2 === 1) {
        classes.push('el-table__row--striped');
      }
      const rowClassName = this.rowClassName;
      if (typeof rowClassName === 'string') {
        classes.push(rowClassName);
      } else if (typeof rowClassName === 'function') {
        classes.push(rowClassName.call(null, row, index) || '');
      }

      return classes.join(' ');
    },

    handleCellMouseEnter(event, row) {
      const table = this.table;
      const cell = getCell(event);

      if (cell) {
        const column = getColumnByCell(table, cell);
        const hoverState = table.hoverState = {cell, column, row};
        table.$emit('cell-mouse-enter', hoverState.row, hoverState.column, hoverState.cell, event);
      }

      // 判断是否text-overflow, 如果是就显示tooltip
      const cellChild = event.target.querySelector('.cell');

      if (hasClass(cellChild, 'el-tooltip') && cellChild.scrollWidth > cellChild.offsetWidth) {
        const tooltip = this.$refs.tooltip;

        this.tooltipContent = cell.innerText;
        tooltip.referenceElm = cell;
        tooltip.$refs.popper && (tooltip.$refs.popper.style.display = 'none');
        tooltip.doDestroy();
        tooltip.setExpectedState(true);
        this.activateTooltip(tooltip);
      }
    },

    handleCellMouseLeave(event) {
      const tooltip = this.$refs.tooltip;
      if (tooltip) {
        tooltip.setExpectedState(false);
        tooltip.handleClosePopper();
      }
      const cell = getCell(event);
      if (!cell) return;

      const oldHoverState = this.table.hoverState;
      this.table.$emit('cell-mouse-leave', oldHoverState.row, oldHoverState.column, oldHoverState.cell, event);
    },

    handleMouseEnter(index) {
      this.store.commit('setHoverRow', index);
    },

    handleMouseLeave() {
      this.store.commit('setHoverRow', null);
    },

    handleContextMenu(event, row) {
      this.handleEvent(event, row, 'contextmenu');
    },

    handleDoubleClick(event, row) {
      this.handleEvent(event, row, 'dblclick');
    },

    handleClick(event, row) {
      this.store.commit('setCurrentRow', row);
      this.handleEvent(event, row, 'click');
    },

    handleEvent(event, row, name) {
      const table = this.table;
      const cell = getCell(event);
      let column;
      if (cell) {
        column = getColumnByCell(table, cell);
        if (column) {
          table.$emit(`cell-${name}`, row, column, cell, event);
        }
      }
      table.$emit(`row-${name}`, row, event, column);
    },

    handleExpandClick(row) {
      this.store.commit('toggleRowExpanded', row);
    }
  }
};

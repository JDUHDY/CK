/**
 * 协作存储测试插件
 * 用于测试插件协作存储功能的示例插件
 */
class SharedStorageTestPlugin {
    constructor(pluginApi) {
        this.api = pluginApi;
        this.name = '协作存储测试';
        this.pluginId = 'shared-storage-test';
        this.container = null;
    }

    async onActivate() {
        console.log('[协作存储测试] 插件激活');

        // 创建测试按钮
        this.createTestUI();

        // 运行测试
        await this.runTests();
    }

    async onDeactivate() {
        console.log('[协作存储测试] 插件停用');
        this.removeTestUI();
    }

    createTestUI() {
        // 检查是否已存在
        if (this.container) return;

        const container = this.api.ui.createElement('div', {
            className: 'shared-storage-test-container',
            id: 'shared-storage-test-plugin',
            style: {
                padding: '20px',
                backgroundColor: '#f5f5f5',
                borderRadius: '8px',
                marginTop: '20px',
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: '99',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                maxWidth: '1000px',
                width: '90%'
            }
        });

        const header = this.api.ui.createElement('div', {
            style: {
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '15px'
            }
        });

        const title = this.api.ui.createElement('h3', {
            style: { margin: '0', color: '#333' }
        }, '协作存储测试插件');

        const closeButton = this.api.ui.createElement('button', {
            className: 'btn btn-sm',
            style: {
                padding: '5px 10px',
                fontSize: '14px',
                cursor: 'pointer',
                background: '#ff0000b5'
            },
            onclick: () => this.removeTestUI()
        }, '×');

        header.appendChild(title);
        header.appendChild(closeButton);

        const testSection = this.api.ui.createElement('div', {
            className: 'test-section',
            style: { marginBottom: '20px' }
        });

        const buttonGroup = this.api.ui.createElement('div', {
            style: { display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '15px' }
        });

        const testGlobalBtn = this.api.ui.createElement('button', {
            className: 'btn btn-primary',
            onclick: () => this.testGlobalStorage()
        }, '测试全局共享');

        const testGroupBtn = this.api.ui.createElement('button', {
            className: 'btn btn-success',
            onclick: () => this.testGroupStorage()
        }, '测试群组共享');

        const resultArea = this.api.ui.createElement('div', {
            id: 'shared-storage-test-result',
            className: 'test-result',
            style: {
                backgroundColor: '#fff',
                padding: '15px',
                borderRadius: '4px',
                minHeight: '100px',
                maxHeight: '400px',
                overflowY: 'auto',
                fontFamily: 'monospace',
                fontSize: '12px',
                border: '1px solid #ddd'
            }
        });

        buttonGroup.appendChild(testGlobalBtn);
        buttonGroup.appendChild(testGroupBtn);

        testSection.appendChild(buttonGroup);
        testSection.appendChild(resultArea);

        container.appendChild(header);
        container.appendChild(testSection);

        // 添加到页面
        document.body.appendChild(container);
        this.container = container;
    }

    removeTestUI() {
        if (this.container) {
            this.container.remove();
            this.container = null;
        }
    }

    log(message, type = 'info') {
        const resultArea = document.getElementById('shared-storage-test-result');
        if (resultArea) {
            const timestamp = new Date().toLocaleTimeString();
            const color = type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : type === 'warning' ? '#ffc107' : '#007bff';
            resultArea.innerHTML += `<div style="color: ${color}; margin-bottom: 5px;">[${timestamp}] ${message}</div>`;
            resultArea.scrollTop = resultArea.scrollHeight;
        }
        console.log(`[协作存储测试] ${message}`);
    }

    async testGlobalStorage() {
        this.log('=== 开始测试全局共享存储 ===', 'info');

        try {
            // 测试写入
            const testData = {
                timestamp: Date.now(),
                message: 'Hello from global shared storage!',
                testData: { key1: 'value1', key2: 123 }
            };

            this.log('正在写入全局共享数据...', 'info');
            const writeSuccess = await this.api.storage.setShared('test-global', testData, 'global');

            if (writeSuccess) {
                this.log('✓ 全局数据写入成功', 'success');
            } else {
                this.log('✗ 全局数据写入失败', 'error');
                return;
            }

            // 测试读取
            this.log('正在读取全局共享数据...', 'info');
            const readData = await this.api.storage.getShared('test-global', 'global');

            if (readData) {
                this.log(`✓ 全局数据读取成功: ${JSON.stringify(readData)}`, 'success');
            } else {
                this.log('✗ 全局数据读取失败', 'error');
                return;
            }

            // 验证数据一致性
            if (JSON.stringify(readData) === JSON.stringify(testData)) {
                this.log('✓ 数据一致性验证通过', 'success');
            } else {
                this.log('✗ 数据一致性验证失败', 'error');
            }

            // 测试删除
            this.log('正在删除全局共享数据...', 'info');
            const deleteSuccess = await this.api.storage.removeShared('test-global', 'global');

            if (deleteSuccess) {
                this.log('✓ 全局数据删除成功', 'success');
            } else {
                this.log('✗ 全局数据删除失败', 'error');
            }

            // 验证删除
            const afterDelete = await this.api.storage.getShared('test-global', 'global');
            if (afterDelete === null) {
                this.log('✓ 删除验证通过（数据已不存在）', 'success');
            } else {
                this.log('✗ 删除验证失败（数据仍然存在）', 'error');
            }

            this.log('=== 全局共享存储测试完成 ===', 'success');

        } catch (error) {
            this.log(`✗ 测试过程中发生错误: ${error.message}`, 'error');
            console.error(error);
        }
    }

    async testGroupStorage() {
        this.log('=== 开始测试群组共享存储 ===', 'info');

        try {
            // 首先获取用户所在的群组
            // 注意：这个功能需要从主应用获取当前用户的群组信息
            // 这里我们模拟使用群组ID 1

            const groupId = '1';
            const scope = `group:${groupId}`;

            this.log(`使用群组范围: ${scope}`, 'info');

            // 测试写入
            const testData = {
                timestamp: Date.now(),
                message: 'Hello from group shared storage!',
                groupId: groupId,
                testData: { task1: 'completed', task2: 'pending' }
            };

            this.log('正在写入群组共享数据...', 'info');
            const writeSuccess = await this.api.storage.setShared('test-group-tasks', testData, scope);

            if (writeSuccess) {
                this.log('✓ 群组数据写入成功', 'success');
            } else {
                this.log('✗ 群组数据写入失败（可能是因为用户不在该群组中）', 'warning');
                return;
            }

            // 测试读取
            this.log('正在读取群组共享数据...', 'info');
            const readData = await this.api.storage.getShared('test-group-tasks', scope);

            if (readData) {
                this.log(`✓ 群组数据读取成功: ${JSON.stringify(readData)}`, 'success');
            } else {
                this.log('✗ 群组数据读取失败', 'error');
                return;
            }

            // 验证数据一致性
            if (JSON.stringify(readData) === JSON.stringify(testData)) {
                this.log('✓ 数据一致性验证通过', 'success');
            } else {
                this.log('✗ 数据一致性验证失败', 'error');
            }

            // 测试更新数据
            const updatedData = {
                ...readData,
                updated: true,
                newField: 'added'
            };

            this.log('正在更新群组共享数据...', 'info');
            const updateSuccess = await this.api.storage.setShared('test-group-tasks', updatedData, scope);

            if (updateSuccess) {
                this.log('✓ 群组数据更新成功', 'success');
            } else {
                this.log('✗ 群组数据更新失败', 'error');
            }

            // 读取更新后的数据
            const finalData = await this.api.storage.getShared('test-group-tasks', scope);
            if (finalData && finalData.updated) {
                this.log('✓ 更新后的数据验证通过', 'success');
            }

            // 清理测试数据
            this.log('正在清理群组共享数据...', 'info');
            await this.api.storage.removeShared('test-group-tasks', scope);
            this.log('✓ 清理完成', 'success');

            this.log('=== 群组共享存储测试完成 ===', 'success');

        } catch (error) {
            this.log(`✗ 测试过程中发生错误: ${error.message}`, 'error');
            console.error(error);
        }
    }

    async runTests() {
        this.log('插件已加载，点击按钮开始测试', 'info');
        this.log('提示：群组共享测试需要用户是群组ID为1的成员', 'warning');
    }
}

// 注册插件
registerPlugin('shared-storage-test', SharedStorageTestPlugin);